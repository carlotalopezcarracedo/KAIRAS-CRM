import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import {
  parseChecklist,
  type TaskCreateInput,
  type TaskUpdateInput,
} from "@/server/validators/task";
import type { Prisma, TaskStatus } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;
const OPEN_STATUSES: TaskStatus[] = ["todo", "in_progress", "waiting"];

export type TaskView = "today" | "overdue" | "upcoming" | "all" | "done";

export async function listTasks(view: TaskView, projectId?: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const where: Prisma.TaskWhereInput = { ...notDeleted };
  if (projectId) where.projectId = projectId;

  switch (view) {
    case "today":
      where.status = { in: OPEN_STATUSES };
      where.dueAt = { gte: startOfToday, lte: endOfToday };
      break;
    case "overdue":
      where.status = { in: OPEN_STATUSES };
      where.dueAt = { lt: startOfToday };
      break;
    case "upcoming":
      where.status = { in: OPEN_STATUSES };
      where.OR = [{ dueAt: { gt: endOfToday } }, { dueAt: null }];
      break;
    case "done":
      where.status = { in: ["done", "cancelled"] };
      break;
    case "all":
      where.status = { in: OPEN_STATUSES };
      break;
  }

  return prisma.task.findMany({
    where,
    orderBy:
      view === "done"
        ? [{ completedAt: "desc" }]
        : [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take: 200,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
    },
  });
}

export async function getTask(id: string) {
  return prisma.task.findFirst({
    where: { id, ...notDeleted },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true } },
      timeEntries: {
        where: { deletedAt: null },
        select: { durationSeconds: true },
      },
    },
  });
}

export async function createTask(actorId: string, input: TaskCreateInput) {
  const task = await prisma.task.create({
    data: {
      ...input,
      checklist: parseChecklist(input.checklist) ?? undefined,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      opportunityId: input.opportunityId || null,
    },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Task",
    entityId: task.id,
    after: { title: task.title, dueAt: task.dueAt?.toISOString() ?? null },
  });
  return task;
}

export async function updateTask(
  actorId: string,
  id: string,
  input: TaskUpdateInput,
) {
  const before = await prisma.task.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const previousChecklist = Array.isArray(before.checklist)
    ? (before.checklist as { label: string; done: boolean }[])
    : undefined;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...input,
      checklist: parseChecklist(input.checklist, previousChecklist) ?? undefined,
      leadId: input.leadId === undefined ? undefined : input.leadId || null,
      clientId: input.clientId === undefined ? undefined : input.clientId || null,
      projectId: input.projectId === undefined ? undefined : input.projectId || null,
      opportunityId:
        input.opportunityId === undefined ? undefined : input.opportunityId || null,
      completedAt:
        input.status === "done"
          ? (before.completedAt ?? new Date())
          : input.status
            ? null
            : undefined,
    },
  });
  await audit({
    actorId,
    action: "update",
    entityType: "Task",
    entityId: id,
    before: { status: before.status },
    after: { status: task.status },
  });
  return task;
}

export async function setTaskStatus(
  actorId: string,
  id: string,
  status: TaskStatus,
) {
  const before = await prisma.task.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const task = await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
  });
  await audit({
    actorId,
    action: "status_change",
    entityType: "Task",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return task;
}

export async function toggleChecklistItem(
  actorId: string,
  id: string,
  index: number,
) {
  const task = await prisma.task.findFirst({ where: { id, ...notDeleted } });
  if (!task) throw new Error("NOT_FOUND");
  const checklist = Array.isArray(task.checklist)
    ? ([...(task.checklist as { label: string; done: boolean }[])] as {
        label: string;
        done: boolean;
      }[])
    : [];
  if (!checklist[index]) throw new Error("NOT_FOUND");
  checklist[index] = { ...checklist[index], done: !checklist[index].done };
  await prisma.task.update({ where: { id }, data: { checklist } });
  return checklist;
}

export async function softDeleteTask(actorId: string, id: string) {
  const task = await prisma.task.findFirst({ where: { id, ...notDeleted } });
  if (!task) throw new Error("NOT_FOUND");
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "Task",
    entityId: id,
    before: { title: task.title },
  });
}

export async function getTaskCounts() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [today, overdue, upcoming, all] = await Promise.all([
    prisma.task.count({
      where: {
        ...notDeleted,
        status: { in: OPEN_STATUSES },
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    prisma.task.count({
      where: {
        ...notDeleted,
        status: { in: OPEN_STATUSES },
        dueAt: { lt: startOfToday },
      },
    }),
    prisma.task.count({
      where: {
        ...notDeleted,
        status: { in: OPEN_STATUSES },
        OR: [{ dueAt: { gt: endOfToday } }, { dueAt: null }],
      },
    }),
    prisma.task.count({ where: { ...notDeleted, status: { in: OPEN_STATUSES } } }),
  ]);
  return { today, overdue, upcoming, all };
}
