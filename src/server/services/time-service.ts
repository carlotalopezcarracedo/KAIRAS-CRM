import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { dateKey } from "@/lib/utils";
import { startOfMonthMadrid } from "@/lib/dates";
import { resolveHourlyRate } from "@/server/services/rate-service";
import { getAppDefaults } from "@/server/services/settings-service";
import type {
  TimerStartInput,
  TimeEntryCreateInput,
} from "@/server/validators/time";
import type { Prisma, TimeEntryStatus, TimeEntryOrigin } from "@prisma/client";
import {
  pushTimeEntry,
  deleteTimeEntryInToggl,
  deleteRemoteTimerEntry,
  startRemoteTimer,
  stopRemoteTimer,
} from "@/server/services/toggl-push-service";

const notDeleted = { deletedAt: null } as const;

/**
 * Opciones comunes de las mutaciones de tiempo.
 *
 * ANTILOOP: `syncToToggl: false` es la vía explícita para que un cambio que
 * VIENE de Toggl (webhook, reconciliación, importación) no rebote hacia Toggl.
 * El camino remoto usa además `applyRemoteEntry`, que ni siquiera importa el
 * servicio de push, así que la separación no depende solo de este flag.
 */
export type TimeMutationOptions = { syncToToggl?: boolean };

/**
 * Lanza el push sin dejar que un fallo de Toggl tumbe la operación local.
 * El servicio de push ya persiste syncStatus/lastSyncError por su cuenta.
 */
async function trySync(run: () => Promise<unknown>) {
  try {
    await run();
  } catch {
    // Nunca debe romper la acción de la usuaria: el estado de sincronización
    // queda como "pending"/"error" y se puede reintentar desde la UI.
  }
}

/**
 * Estados en los que una entrada ya no se puede editar sin desbloqueo.
 * Exportado: la sincronización con Toggl reutiliza esta misma regla para no
 * dejar que un cambio remoto pise una entrada ya en cola de factura o facturada.
 */
export const LOCKED_STATUSES: TimeEntryStatus[] = ["queued_for_invoice", "invoiced"];

/**
 * Autorización sobre una TimeEntry ya cargada (IDOR): la propietaria
 * administra todas, cualquier otra usuaria solo las suyas. Nunca debe bastar
 * con conocer el id -- por eso esto se llama SIEMPRE después de cargar la
 * fila y ANTES de mirar nada más de su contenido (estado bloqueado incluido),
 * para no filtrar ni siquiera esa información a quien no tiene permiso.
 * Reutiliza el mismo criterio que ya usa `retryEntrySyncAction` en las
 * acciones de Toggl: no se crea ningún sistema de permisos nuevo.
 */
async function assertCanManageEntry(userId: string, entry: { userId: string }) {
  if (entry.userId === userId) return;
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (actor?.role !== "owner") throw new Error("FORBIDDEN");
}

// ---------------------------------------------------------------------------
// Cronómetro
// ---------------------------------------------------------------------------

export const getActiveTimer = cache(async function getActiveTimer(userId: string) {
  return prisma.timerSession.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });
});

/** Catálogos usados únicamente por el formulario de entrada manual. */
export async function getTimeEntryExtraOptions() {
  const [services, tasks] = await Promise.all([
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: ["todo", "in_progress", "waiting"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true },
    }),
  ]);
  return { services, tasks };
}

/**
 * Arranca el cronómetro. Si ya hay uno activo, lo para primero
 * (creando su entrada) — igual que Toggl al iniciar uno nuevo.
 */
export async function startTimer(
  userId: string,
  input: TimerStartInput,
  opts: TimeMutationOptions = {},
) {
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

  // Abre la entrada en curso en Toggl (duration -1). Si falla, el cronómetro
  // de Kairas sigue funcionando igual.
  if (opts.syncToToggl !== false) {
    await trySync(() => startRemoteTimer(session));
    return (await prisma.timerSession.findUnique({ where: { id: session.id } })) ?? session;
  }
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
export async function stopTimer(userId: string, opts: TimeMutationOptions = {}) {
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
        // Nace en Kairas: billable queda protegido de por vida (nunca lo pisa
        // una sincronización entrante), y "pending" hasta que el push confirme.
        origin: "kairas",
        billableLocal: true,
        syncStatus: "pending",
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

  // Cierra en Toggl la MISMA entrada que abrió el arranque: no se crea otra.
  if (opts.syncToToggl !== false) {
    await trySync(() =>
      stopRemoteTimer(session.togglTimeEntryId, session.togglWorkspaceId, entry.id),
    );
    return (await prisma.timeEntry.findUnique({ where: { id: entry.id } })) ?? entry;
  }
  return entry;
}

/** Descarta el cronómetro activo sin crear entrada. */
export async function discardTimer(userId: string, opts: TimeMutationOptions = {}) {
  const session = await getActiveTimer(userId);
  if (!session) throw new Error("NO_ACTIVE_TIMER");

  // Descartar en Kairas debe descartar también en Toggl: si no, quedaría un
  // cronómetro remoto corriendo para siempre.
  if (opts.syncToToggl !== false && session.togglTimeEntryId) {
    await trySync(() =>
      deleteRemoteTimerEntry(session.togglTimeEntryId!, session.togglWorkspaceId),
    );
  }

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
  opts: TimeMutationOptions = {},
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
      origin: "kairas",
      billableLocal: true,
      syncStatus: "pending",
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

  if (opts.syncToToggl !== false) {
    await trySync(() => pushTimeEntry(entry.id));
    return (await prisma.timeEntry.findUnique({ where: { id: entry.id } })) ?? entry;
  }
  return entry;
}

export async function updateEntry(
  userId: string,
  id: string,
  input: TimeEntryCreateInput,
  opts: TimeMutationOptions = {},
) {
  const before = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  await assertCanManageEntry(userId, before);
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
      // Editar desde Kairas -- de cualquier origen -- reclama la propiedad de
      // billable: a partir de ahora ninguna sincronización entrante lo pisa.
      billableLocal: true,
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
      // El contenido acaba de cambiar: hasta que el push confirme, el estado
      // de sync visible no debe seguir diciendo "synced" de la edición anterior.
      ...(opts.syncToToggl !== false ? { syncStatus: "pending" as const } : {}),
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

  // Actualiza la MISMA entrada de Toggl (pushTimeEntry usa togglTimeEntryId).
  if (opts.syncToToggl !== false) {
    await trySync(() => pushTimeEntry(id));
    return (await prisma.timeEntry.findUnique({ where: { id } })) ?? entry;
  }
  return entry;
}

export async function setEntryStatus(
  userId: string,
  id: string,
  status: TimeEntryStatus,
) {
  const before = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  await assertCanManageEntry(userId, before);
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

export async function softDeleteEntry(
  userId: string,
  id: string,
  opts: TimeMutationOptions = {},
) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, ...notDeleted } });
  if (!entry) throw new Error("NOT_FOUND");
  await assertCanManageEntry(userId, entry);
  if (entry.lockedAt || LOCKED_STATUSES.includes(entry.status)) {
    throw new Error("LOCKED");
  }
  const deleted = await prisma.timeEntry.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await audit({
    actorId: userId,
    action: "delete",
    entityType: "TimeEntry",
    entityId: id,
    before: { durationSeconds: entry.durationSeconds },
  });

  // Soft delete local + DELETE remoto. Se conserva togglTimeEntryId para que
  // una reconciliación posterior no la reimporte como entrada nueva.
  if (opts.syncToToggl !== false) {
    await trySync(() => deleteTimeEntryInToggl(deleted));
  }
}

// ---------------------------------------------------------------------------
// Listados y resúmenes
// ---------------------------------------------------------------------------

export type TimeRange = { from: Date; to: Date };

export type TimeFilters = {
  clientId?: string[];
  projectId?: string[];
  billable?: boolean;
};

function filtersToWhere(
  userId: string,
  range: TimeRange,
  filters: TimeFilters,
): Prisma.TimeEntryWhereInput {
  return {
    userId,
    ...notDeleted,
    startedAt: { gte: range.from, lte: range.to },
    ...(filters.clientId?.length ? { clientId: { in: filters.clientId } } : {}),
    ...(filters.projectId?.length ? { projectId: { in: filters.projectId } } : {}),
    ...(filters.billable !== undefined ? { billable: filters.billable } : {}),
  };
}

export async function listEntries(
  userId: string,
  range: TimeRange,
  filters: TimeFilters = {},
) {
  return prisma.timeEntry.findMany({
    where: filtersToWhere(userId, range, filters),
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

/**
 * Igual que `listEntries`, pero sin el límite de 500: la vista en pantalla
 * puede permitirse recortar, un extracto exportado no. El tope de 20 000 es
 * solo una salvaguarda contra un rango descomunal, no un límite esperado.
 */
export async function listEntriesForExport(
  userId: string,
  range: TimeRange,
  filters: TimeFilters = {},
) {
  return prisma.timeEntry.findMany({
    where: filtersToWhere(userId, range, filters),
    orderBy: { startedAt: "asc" },
    take: 20_000,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      service: { select: { id: true, name: true } },
    },
  });
}

export async function getTimeSummary(
  userId: string,
  range: TimeRange,
  filters: TimeFilters = {},
) {
  const entries = await prisma.timeEntry.findMany({
    where: filtersToWhere(userId, range, filters),
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

// ---------------------------------------------------------------------------
// Horas por proyecto (sección "Tiempo" de la ficha de proyecto)
// ---------------------------------------------------------------------------

export type ProjectTimeFilters = {
  from?: Date;
  to?: Date;
  billable?: boolean;
  origin?: TimeEntryOrigin;
  q?: string;
};

function projectFiltersToWhere(
  projectId: string,
  filters: ProjectTimeFilters,
): Prisma.TimeEntryWhereInput {
  return {
    projectId,
    ...notDeleted,
    ...(filters.from || filters.to
      ? {
          startedAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.billable !== undefined ? { billable: filters.billable } : {}),
    ...(filters.origin ? { origin: filters.origin } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/**
 * Horas de un proyecto concreto, sin filtrar por usuaria: la ficha de
 * proyecto ya muestra "de quién" no importa en una app de una sola usuaria,
 * y así una entrada importada de Toggl (sin cronómetro Kairas de por medio)
 * también aparece.
 */
export async function listEntriesForProject(
  projectId: string,
  filters: ProjectTimeFilters = {},
) {
  return prisma.timeEntry.findMany({
    where: projectFiltersToWhere(projectId, filters),
    orderBy: { startedAt: "desc" },
    take: 500,
  });
}

/** Resumen de horas del proyecto: total, mes en curso, facturable/no facturable. */
export async function getProjectTimeSummary(projectId: string) {
  const monthStart = startOfMonthMadrid(0, new Date());

  const [total, billable, month] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { projectId, deletedAt: null },
      _sum: { durationSeconds: true },
    }),
    prisma.timeEntry.aggregate({
      where: { projectId, deletedAt: null, billable: true },
      _sum: { durationSeconds: true, calculatedAmount: true },
    }),
    prisma.timeEntry.aggregate({
      where: { projectId, deletedAt: null, startedAt: { gte: monthStart } },
      _sum: { durationSeconds: true },
    }),
  ]);

  const totalSeconds = total._sum.durationSeconds ?? 0;
  const billableSeconds = billable._sum.durationSeconds ?? 0;

  return {
    totalSeconds,
    monthSeconds: month._sum.durationSeconds ?? 0,
    billableSeconds,
    nonBillableSeconds: totalSeconds - billableSeconds,
    billableAmount: Number(billable._sum.calculatedAmount ?? 0),
  };
}
