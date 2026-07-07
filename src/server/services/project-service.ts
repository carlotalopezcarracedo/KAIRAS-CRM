import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { resolveHourlyRate } from "@/server/services/rate-service";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/server/validators/project";

const notDeleted = { deletedAt: null } as const;

export async function listProjects(opts: { status?: string } = {}) {
  const projects = await prisma.project.findMany({
    where: {
      ...notDeleted,
      ...(opts.status
        ? { status: opts.status as never }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
      mainService: { select: { name: true } },
      tasks: {
        where: { deletedAt: null },
        select: { status: true },
      },
    },
  });

  // Horas por proyecto en una sola query
  const hours = await prisma.timeEntry.groupBy({
    by: ["projectId"],
    where: { deletedAt: null, projectId: { in: projects.map((p) => p.id) } },
    _sum: { durationSeconds: true },
  });
  const hoursMap = new Map(
    hours.map((h) => [h.projectId, h._sum.durationSeconds ?? 0]),
  );

  return projects.map((p) => ({
    ...p,
    openTasks: p.tasks.filter((t) =>
      ["todo", "in_progress", "waiting"].includes(t.status),
    ).length,
    totalTasks: p.tasks.length,
    totalSeconds: hoursMap.get(p.id) ?? 0,
  }));
}

export async function getProjectFull(id: string) {
  const project = await prisma.project.findFirst({
    where: { id, ...notDeleted },
    include: {
      client: { select: { id: true, name: true } },
      mainService: { select: { id: true, name: true } },
      proposal: { select: { id: true, title: true } },
      tasks: {
        where: { deletedAt: null },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      notes: { where: notDeleted, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!project) return null;

  const [hours, billableHours, rate] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { projectId: id, deletedAt: null },
      _sum: { durationSeconds: true, calculatedAmount: true },
    }),
    prisma.timeEntry.aggregate({
      where: { projectId: id, deletedAt: null, billable: true },
      _sum: { durationSeconds: true, calculatedAmount: true },
    }),
    resolveHourlyRate({
      projectId: id,
      clientId: project.clientId,
      serviceId: project.mainServiceId,
    }),
  ]);

  const totalSeconds = hours._sum.durationSeconds ?? 0;
  const billableSeconds = billableHours._sum.durationSeconds ?? 0;
  const estimatedAmount = Number(billableHours._sum.calculatedAmount ?? 0);
  const budget = project.budget ? Number(project.budget) : null;

  // Rentabilidad estimada: presupuesto vs coste-horas a la tarifa efectiva.
  const hoursCost = (totalSeconds / 3600) * rate.rate;
  const profitability =
    budget !== null && budget > 0
      ? Math.round(((budget - hoursCost) / budget) * 100)
      : null;

  return {
    project,
    totalSeconds,
    billableSeconds,
    estimatedAmount,
    effectiveRate: rate,
    hoursCost,
    profitability,
  };
}

/** Crea o actualiza la tarifa €/h propia del proyecto (Ajustes → Tarifas). */
async function upsertProjectRate(projectId: string, rate: number | undefined) {
  if (rate === undefined || rate <= 0) return;
  const existing = await prisma.hourlyRate.findFirst({
    where: { scope: "project", projectId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (Number(existing.rate) !== rate) {
      await prisma.hourlyRate.update({ where: { id: existing.id }, data: { rate } });
    }
  } else {
    await prisma.hourlyRate.create({
      data: { scope: "project", projectId, rate, notes: "Definida desde el proyecto" },
    });
  }
}

export async function createProject(actorId: string, input: ProjectCreateInput) {
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, deletedAt: null },
  });
  if (!client) throw new Error("CLIENT_NOT_FOUND");

  const { hourlyRate, ...data } = input;
  const project = await prisma.project.create({
    data: {
      ...data,
      mainServiceId: input.mainServiceId || null,
      proposalId: input.proposalId || null,
    },
  });
  await upsertProjectRate(project.id, hourlyRate);
  await audit({
    actorId,
    action: "create",
    entityType: "Project",
    entityId: project.id,
    after: { name: project.name, clientId: project.clientId },
  });
  return project;
}

export async function updateProject(
  actorId: string,
  id: string,
  input: ProjectUpdateInput,
) {
  const before = await prisma.project.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const { hourlyRate, ...data } = input;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      mainServiceId:
        input.mainServiceId === undefined ? undefined : input.mainServiceId || null,
      proposalId:
        input.proposalId === undefined ? undefined : input.proposalId || null,
    },
  });
  await upsertProjectRate(id, hourlyRate);
  await audit({
    actorId,
    action: "update",
    entityType: "Project",
    entityId: id,
    before: { status: before.status },
    after: { status: project.status },
  });
  return project;
}

export async function softDeleteProject(actorId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, ...notDeleted } });
  if (!project) throw new Error("NOT_FOUND");
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "Project",
    entityId: id,
    before: { name: project.name },
  });
}
