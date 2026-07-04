import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { dateKey } from "@/lib/utils";
import { resolveHourlyRate } from "@/server/services/rate-service";
import { getAppDefaults } from "@/server/services/settings-service";
import type {
  TimerStartInput,
  TimeEntryCreateInput,
} from "@/server/validators/time";
import type { Prisma, TimeEntryStatus } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

/** Estados en los que una entrada ya no se puede editar sin desbloqueo. */
const LOCKED_STATUSES: TimeEntryStatus[] = ["queued_for_invoice", "invoiced"];

// ---------------------------------------------------------------------------
// Cronómetro
// ---------------------------------------------------------------------------

export async function getActiveTimer(userId: string) {
  return prisma.timerSession.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Arranca el cronómetro. Si ya hay uno activo, lo para primero
 * (creando su entrada) — igual que Toggl al iniciar uno nuevo.
 */
export async function startTimer(userId: string, input: TimerStartInput) {
  const existing = await getActiveTimer(userId);
  if (existing) {
    await stopTimer(userId);
  }

  // Deriva cliente desde proyecto/tarea si no viene explícito
  let clientId = input.clientId || null;
  let projectId = input.projectId || null;
  if (input.taskId && (!clientId || !projectId)) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, deletedAt: null },
      select: { clientId: true, projectId: true },
    });
    clientId = clientId ?? task?.clientId ?? null;
    projectId = projectId ?? task?.projectId ?? null;
  }
  if (projectId && !clientId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { clientId: true },
    });
    clientId = project?.clientId ?? null;
  }

  const session = await prisma.timerSession.create({
    data: {
      userId,
      active: true,
      startedAt: new Date(),
      currentTitle: input.title,
      workType: input.workType,
      billable: input.billable ?? true,
      clientId,
      projectId,
      taskId: input.taskId || null,
      serviceId: input.serviceId || null,
    },
  });

  await audit({
    actorId: userId,
    action: "create",
    entityType: "TimerSession",
    entityId: session.id,
    after: { title: input.title ?? null, projectId, clientId },
  });
  return session;
}

/**
 * Redondeo de facturación: hacia ARRIBA al múltiplo de N minutos
 * (Ajustes → Preferencias → Redondeo de tiempo). 0 = sin redondeo.
 */
function applyRounding(seconds: number, roundingMinutes: number): number {
  if (!roundingMinutes || roundingMinutes <= 0) return seconds;
  const step = roundingMinutes * 60;
  return Math.ceil(seconds / step) * step;
}

/** Para el cronómetro activo y crea la TimeEntry correspondiente. */
export async function stopTimer(userId: string) {
  const session = await getActiveTimer(userId);
  if (!session) throw new Error("NO_ACTIVE_TIMER");

  const endedAt = new Date();
  const defaults = await getAppDefaults();
  const rawSeconds = Math.max(
    1,
    Math.round(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000 +
        session.accumulatedSeconds,
    ),
  );
  const durationSeconds = applyRounding(rawSeconds, defaults.timeRounding);

  const rate = await resolveHourlyRate({
    projectId: session.projectId,
    clientId: session.clientId,
    serviceId: session.serviceId,
  });

  const billable = session.billable;
  const calculatedAmount =
    billable && rate.rate > 0
      ? Number(((durationSeconds / 3600) * rate.rate).toFixed(2))
      : null;

  const [entry] = await prisma.$transaction([
    prisma.timeEntry.create({
      data: {
        userId,
        title: session.currentTitle,
        workType: session.workType,
        source: "timer",
        startedAt: session.startedAt,
        endedAt,
        durationSeconds,
        billable,
        hourlyRate: billable && rate.rate > 0 ? rate.rate : null,
        calculatedAmount,
        status: billable ? "draft" : "non_billable",
        clientId: session.clientId,
        projectId: session.projectId,
        taskId: session.taskId,
        serviceId: session.serviceId,
      },
    }),
    prisma.timerSession.delete({ where: { id: session.id } }),
  ]);

  await audit({
    actorId: userId,
    action: "create",
    entityType: "TimeEntry",
    entityId: entry.id,
    metadata: { source: "timer", durationSeconds },
  });
  return entry;
}

/** Descarta el cronómetro activo sin crear entrada. */
export async function discardTimer(userId: string) {
  const session = await getActiveTimer(userId);
  if (!session) throw new Error("NO_ACTIVE_TIMER");
  await prisma.timerSession.delete({ where: { id: session.id } });
  await audit({
    actorId: userId,
    action: "delete",
    entityType: "TimerSession",
    entityId: session.id,
    metadata: { discarded: true },
  });
}

// ---------------------------------------------------------------------------
// Entradas manuales y edición
// ---------------------------------------------------------------------------

async function computeAmount(input: {
  billable: boolean;
  manualRate?: number;
  projectId?: string | null;
  clientId?: string | null;
  serviceId?: string | null;
  durationSeconds: number;
}) {
  if (!input.billable) return { hourlyRate: null, calculatedAmount: null };
  const rate =
    input.manualRate !== undefined
      ? { rate: input.manualRate }
      : await resolveHourlyRate({
          projectId: input.projectId,
          clientId: input.clientId,
          serviceId: input.serviceId,
        });
  if (rate.rate <= 0) return { hourlyRate: null, calculatedAmount: null };
  return {
    hourlyRate: rate.rate,
    calculatedAmount: Number(
      ((input.durationSeconds / 3600) * rate.rate).toFixed(2),
    ),
  };
}

export async function createManualEntry(
  userId: string,
  input: TimeEntryCreateInput,
) {
  const durationSeconds = Math.round(
    (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
  );

  let clientId = input.clientId || null;
  const projectId = input.projectId || null;
  if (projectId && !clientId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: { clientId: true },
    });
    clientId = project?.clientId ?? null;
  }

  const { hourlyRate, calculatedAmount } = await computeAmount({
    billable: input.billable,
    manualRate: input.hourlyRate,
    projectId,
    clientId,
    serviceId: input.serviceId || null,
    durationSeconds,
  });

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      workType: input.workType,
      source: "manual",
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds,
      billable: input.billable,
      hourlyRate,
      calculatedAmount,
      status: input.billable ? "draft" : "non_billable",
      clientId,
      projectId,
      taskId: input.taskId || null,
      serviceId: input.serviceId || null,
    },
  });

  await audit({
    actorId: userId,
    action: "create",
    entityType: "TimeEntry",
    entityId: entry.id,
    metadata: { source: "manual", durationSeconds },
  });
  return entry;
}

export async function updateEntry(
  userId: string,
  id: string,
  input: TimeEntryCreateInput,
) {
  const before = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  if (before.lockedAt || LOCKED_STATUSES.includes(before.status)) {
    throw new Error("LOCKED");
  }

  const durationSeconds = Math.round(
    (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
  );

  let clientId = input.clientId || null;
  const projectId = input.projectId || null;
  if (projectId && !clientId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: { clientId: true },
    });
    clientId = project?.clientId ?? null;
  }

  const { hourlyRate, calculatedAmount } = await computeAmount({
    billable: input.billable,
    manualRate: input.hourlyRate,
    projectId,
    clientId,
    serviceId: input.serviceId || null,
    durationSeconds,
  });

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      title: input.title ?? null,
      description: input.description ?? null,
      workType: input.workType,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds,
      billable: input.billable,
      hourlyRate,
      calculatedAmount,
      status: input.billable
        ? before.status === "non_billable"
          ? "draft"
          : before.status
        : "non_billable",
      clientId,
      projectId,
      taskId: input.taskId || null,
      serviceId: input.serviceId || null,
    },
  });

  await audit({
    actorId: userId,
    action: "update",
    entityType: "TimeEntry",
    entityId: id,
    before: { durationSeconds: before.durationSeconds },
    after: { durationSeconds },
  });
  return entry;
}

export async function setEntryStatus(
  userId: string,
  id: string,
  status: TimeEntryStatus,
) {
  const before = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  if (before.lockedAt && status !== before.status) throw new Error("LOCKED");

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: { status },
  });
  await audit({
    actorId: userId,
    action: "status_change",
    entityType: "TimeEntry",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return entry;
}

export async function softDeleteEntry(userId: string, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!entry) throw new Error("NOT_FOUND");
  if (entry.lockedAt || LOCKED_STATUSES.includes(entry.status)) {
    throw new Error("LOCKED");
  }
  await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId: userId,
    action: "delete",
    entityType: "TimeEntry",
    entityId: id,
    before: { durationSeconds: entry.durationSeconds },
  });
}

// ---------------------------------------------------------------------------
// Listados y resúmenes
// ---------------------------------------------------------------------------

export type TimeRange = { from: Date; to: Date };

export async function listEntries(
  userId: string,
  range: TimeRange,
  filters: { clientId?: string; projectId?: string } = {},
) {
  const where: Prisma.TimeEntryWhereInput = {
    userId,
    ...notDeleted,
    startedAt: { gte: range.from, lte: range.to },
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
  };
  return prisma.timeEntry.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 500,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      service: { select: { id: true, name: true } },
    },
  });
}

export async function getTimeSummary(userId: string, range: TimeRange) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      ...notDeleted,
      startedAt: { gte: range.from, lte: range.to },
    },
    select: {
      durationSeconds: true,
      billable: true,
      calculatedAmount: true,
      startedAt: true,
      workType: true,
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  let totalSeconds = 0;
  let billableSeconds = 0;
  let billableAmount = 0;
  const byClient = new Map<string, { name: string; seconds: number; amount: number }>();
  const byProject = new Map<string, { name: string; seconds: number; amount: number }>();
  const byDay = new Map<string, { seconds: number; billableSeconds: number }>();
  const byWorkType = new Map<string, number>();

  for (const e of entries) {
    totalSeconds += e.durationSeconds;
    if (e.billable) {
      billableSeconds += e.durationSeconds;
      billableAmount += Number(e.calculatedAmount ?? 0);
    }
    const clientKey = e.client?.id ?? "none";
    const clientEntry = byClient.get(clientKey) ?? {
      name: e.client?.name ?? "Sin cliente",
      seconds: 0,
      amount: 0,
    };
    clientEntry.seconds += e.durationSeconds;
    clientEntry.amount += e.billable ? Number(e.calculatedAmount ?? 0) : 0;
    byClient.set(clientKey, clientEntry);

    const projectKey = e.project?.id ?? "none";
    const projectEntry = byProject.get(projectKey) ?? {
      name: e.project?.name ?? "Sin proyecto",
      seconds: 0,
      amount: 0,
    };
    projectEntry.seconds += e.durationSeconds;
    projectEntry.amount += e.billable ? Number(e.calculatedAmount ?? 0) : 0;
    byProject.set(projectKey, projectEntry);

    const dayKey = dateKey(e.startedAt);
    const dayEntry = byDay.get(dayKey) ?? { seconds: 0, billableSeconds: 0 };
    dayEntry.seconds += e.durationSeconds;
    if (e.billable) dayEntry.billableSeconds += e.durationSeconds;
    byDay.set(dayKey, dayEntry);

    byWorkType.set(
      e.workType,
      (byWorkType.get(e.workType) ?? 0) + e.durationSeconds,
    );
  }

  return {
    totalSeconds,
    billableSeconds,
    nonBillableSeconds: totalSeconds - billableSeconds,
    billableAmount,
    entriesCount: entries.length,
    byClient: [...byClient.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.seconds - a.seconds),
    byProject: [...byProject.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.seconds - a.seconds),
    byDay,
    byWorkType: [...byWorkType.entries()]
      .map(([workType, seconds]) => ({ workType, seconds }))
      .sort((a, b) => b.seconds - a.seconds),
  };
}
