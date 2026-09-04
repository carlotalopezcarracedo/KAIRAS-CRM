/**
 * Push Kairas -> Toggl.
 *
 * Regla de oro de este archivo: **nunca puede perderse un dato local**. Toggl es
 * el destino, no la fuente de verdad. Si Toggl falla, la TimeEntry de Kairas se
 * queda tal cual y solo se anota el estado de sincronización para poder
 * reintentar.
 *
 * ANTILOOP: este módulo es el ÚNICO que escribe en Toggl a partir de cambios
 * locales. El camino contrario (webhook / reconciliación) entra por
 * `applyRemoteEntry` en toggl-sync-service, que jamás importa este archivo. La
 * separación es arquitectónica, no un flag que se pueda olvidar de pasar.
 */
import { prisma } from "@/server/db/prisma";
import {
  TogglClient,
  TogglApiError,
  getTogglConfig,
  isTogglQuotaLow,
  type TogglTimeEntry,
} from "@/integrations/toggl/adapter";
import { getTogglSettings } from "@/server/services/toggl-connection-service";
import type { TimeEntry, TimerSession } from "@prisma/client";

/** Motivo por el que un push no se ha intentado siquiera. */
export type PushSkipReason =
  | "NOT_CONFIGURED" // falta TOGGL_API_TOKEN
  | "NO_WORKSPACE" // aún no se ha elegido workspace
  | "NO_PROJECT_MAPPING" // el proyecto Kairas no está vinculado a uno de Toggl
  | "REMOTE_ORIGIN" // la entrada nació en Toggl: no se re-empuja
  | "DELETED"; // la entrada local ya no existe

export type PushOutcome =
  | { ok: true; action: "created" | "updated" | "deleted" | "stopped" }
  | { ok: false; skipped: PushSkipReason; message: string }
  | { ok: false; error: true; message: string };

/**
 * Mensaje de error apto para guardar y enseñar. Nunca incluye el token: el
 * adapter ya construye errores sin cabeceras ni credenciales.
 */
export function sanitizePushError(err: unknown): string {
  if (err instanceof TogglApiError) return err.message;
  if (err instanceof Error) {
    // Errores de red de fetch ("fetch failed", ENOTFOUND...): mensaje genérico.
    return "No se ha podido contactar con Toggl. Se reintentará.";
  }
  return "Error desconocido al sincronizar con Toggl.";
}

const SKIP_MESSAGES: Record<PushSkipReason, string> = {
  NOT_CONFIGURED: "Toggl no está configurado (falta el token de API).",
  NO_WORKSPACE: "Elige un workspace de Toggl en Integraciones.",
  NO_PROJECT_MAPPING:
    "El proyecto de esta entrada no está vinculado a ningún proyecto de Toggl.",
  REMOTE_ORIGIN: "La entrada procede de Toggl; no se reenvía.",
  DELETED: "La entrada ya no existe en Kairas.",
};

type PushContext = { client: TogglClient; workspaceId: number };

/** Comprueba configuración y workspace una sola vez por operación. */
async function resolveContext(): Promise<PushContext | PushSkipReason> {
  if (!getTogglConfig().configured) return "NOT_CONFIGURED";
  const settings = await getTogglSettings();
  if (!settings.workspaceId) return "NO_WORKSPACE";
  return { client: new TogglClient(), workspaceId: settings.workspaceId };
}

/**
 * Proyecto de Toggl para un proyecto de Kairas.
 *
 * Devuelve `undefined` si la entrada no tiene proyecto (es válido: Toggl acepta
 * entradas sin proyecto) y `null` si tiene proyecto pero no hay mapping, que es
 * el caso que debe bloquear el push sin perder la entrada.
 */
async function resolveTogglProjectId(
  kairasProjectId: string | null,
): Promise<number | null | undefined> {
  if (!kairasProjectId) return undefined;
  const mapping = await prisma.togglProjectMapping.findFirst({
    where: { kairasProjectId },
    select: { togglProjectId: true },
  });
  if (!mapping) return null;
  const parsed = Number(mapping.togglProjectId);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Anota el resultado de sincronización sin tocar los datos de negocio. */
async function markSynced(entryId: string, remote: TogglTimeEntry, workspaceId: number) {
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      togglTimeEntryId: String(remote.id),
      togglWorkspaceId: String(workspaceId),
      togglProjectId: remote.projectId ? String(remote.projectId) : null,
      // El "at" que devuelve Toggl es el estado remoto confirmado: guardarlo
      // hace que el webhook que anuncia ESTA misma escritura sea un no-op.
      togglUpdatedAt: new Date(remote.updatedAt),
      syncStatus: "synced",
      lastSyncedAt: new Date(),
      lastSyncError: null,
      syncAttempts: 0,
      lastSyncAttemptAt: new Date(),
    },
  });
}

async function markFailed(entryId: string, message: string, pending: boolean) {
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      syncStatus: pending ? "pending" : "error",
      lastSyncError: message.slice(0, 500),
      lastSyncAttemptAt: new Date(),
      syncAttempts: { increment: 1 },
    },
  });
}

function toRfc3339(d: Date): string {
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Entradas cerradas (manual, o la que genera el cronómetro al pararse)
// ---------------------------------------------------------------------------

/**
 * Crea o actualiza en Toggl la entrada indicada.
 *
 * Idempotente respecto a Toggl: si ya hay `togglTimeEntryId` actualiza esa
 * misma entrada en vez de crear otra.
 */
export async function pushTimeEntry(entryId: string): Promise<PushOutcome> {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { ok: false, skipped: "DELETED", message: SKIP_MESSAGES.DELETED };
  if (entry.deletedAt) return deleteTimeEntryInToggl(entry);

  const ctx = await resolveContext();
  if (typeof ctx === "string") {
    // Sin configuración no es un error de la usuaria: queda pendiente.
    await markFailed(entry.id, SKIP_MESSAGES[ctx], true);
    return { ok: false, skipped: ctx, message: SKIP_MESSAGES[ctx] };
  }

  const projectId = await resolveTogglProjectId(entry.projectId);
  if (projectId === null) {
    await markFailed(entry.id, SKIP_MESSAGES.NO_PROJECT_MAPPING, true);
    return {
      ok: false,
      skipped: "NO_PROJECT_MAPPING",
      message: SKIP_MESSAGES.NO_PROJECT_MAPPING,
    };
  }

  const payload = {
    description: entry.title ?? "",
    start: toRfc3339(entry.startedAt),
    stop: entry.endedAt ? toRfc3339(entry.endedAt) : null,
    durationSeconds: entry.endedAt ? entry.durationSeconds : -1,
    projectId: projectId ?? null,
    billable: entry.billable,
  };

  try {
    if (entry.togglTimeEntryId) {
      const remote = await ctx.client.updateTimeEntry(
        Number(entry.togglWorkspaceId ?? ctx.workspaceId),
        Number(entry.togglTimeEntryId),
        payload,
      );
      await markSynced(entry.id, remote, Number(entry.togglWorkspaceId ?? ctx.workspaceId));
      return { ok: true, action: "updated" };
    }

    const remote = await ctx.client.createTimeEntry(ctx.workspaceId, payload);
    await markSynced(entry.id, remote, ctx.workspaceId);
    return { ok: true, action: "created" };
  } catch (err) {
    const message = sanitizePushError(err);
    // 404 al actualizar = la entrada ya no está en Toggl. No se recrea sola:
    // se marca error para que la usuaria decida (evita resucitar borrados).
    const notFound = err instanceof TogglApiError && err.code === "NOT_FOUND";
    await markFailed(entry.id, notFound ? "La entrada ya no existe en Toggl." : message, !notFound);
    return { ok: false, error: true, message };
  }
}

/** Borra en Toggl la entrada asociada, si la hay. */
export async function deleteTimeEntryInToggl(entry: TimeEntry): Promise<PushOutcome> {
  if (!entry.togglTimeEntryId) {
    // Nunca llegó a Toggl: nada que borrar, y deja de estar pendiente.
    await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { syncStatus: "synced", lastSyncedAt: new Date(), lastSyncError: null },
    });
    return { ok: true, action: "deleted" };
  }

  const ctx = await resolveContext();
  if (typeof ctx === "string") {
    await markFailed(entry.id, SKIP_MESSAGES[ctx], true);
    return { ok: false, skipped: ctx, message: SKIP_MESSAGES[ctx] };
  }

  try {
    await ctx.client.deleteTimeEntry(
      Number(entry.togglWorkspaceId ?? ctx.workspaceId),
      Number(entry.togglTimeEntryId),
    );
  } catch (err) {
    // Si ya no existía en Toggl, el objetivo está cumplido.
    const gone = err instanceof TogglApiError && err.code === "NOT_FOUND";
    if (!gone) {
      const message = sanitizePushError(err);
      await markFailed(entry.id, message, true);
      return { ok: false, error: true, message };
    }
  }

  // Trazabilidad: se conserva togglTimeEntryId para que una reconciliación
  // posterior reconozca la entrada y no la reimporte como nueva.
  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      syncStatus: "synced",
      lastSyncedAt: new Date(),
      lastSyncError: null,
      syncAttempts: 0,
    },
  });
  return { ok: true, action: "deleted" };
}

// ---------------------------------------------------------------------------
// Cronómetro
// ---------------------------------------------------------------------------

/**
 * Abre en Toggl una entrada en curso para el cronómetro recién arrancado.
 *
 * En Kairas la TimeEntry no existe hasta que se para el cronómetro, así que el
 * vínculo se guarda de momento en la TimerSession. Un fallo aquí no impide
 * cronometrar: solo se anota en `togglSyncError`.
 */
export async function startRemoteTimer(session: TimerSession): Promise<PushOutcome> {
  const ctx = await resolveContext();
  if (typeof ctx === "string") {
    await prisma.timerSession.update({
      where: { id: session.id },
      data: { togglSyncError: SKIP_MESSAGES[ctx] },
    });
    return { ok: false, skipped: ctx, message: SKIP_MESSAGES[ctx] };
  }

  const projectId = await resolveTogglProjectId(session.projectId);
  if (projectId === null) {
    await prisma.timerSession.update({
      where: { id: session.id },
      data: { togglSyncError: SKIP_MESSAGES.NO_PROJECT_MAPPING },
    });
    return {
      ok: false,
      skipped: "NO_PROJECT_MAPPING",
      message: SKIP_MESSAGES.NO_PROJECT_MAPPING,
    };
  }

  try {
    const remote = await ctx.client.createTimeEntry(ctx.workspaceId, {
      description: session.currentTitle ?? "",
      start: toRfc3339(session.startedAt),
      // Convención de Toggl para "en curso": duration negativa. -1 es el valor
      // recomendado y `stop` se omite.
      durationSeconds: -1,
      stop: null,
      projectId: projectId ?? null,
      billable: session.billable,
    });
    await prisma.timerSession.update({
      where: { id: session.id },
      data: {
        togglTimeEntryId: String(remote.id),
        togglWorkspaceId: String(ctx.workspaceId),
        togglSyncError: null,
      },
    });
    return { ok: true, action: "created" };
  } catch (err) {
    const message = sanitizePushError(err);
    await prisma.timerSession.update({
      where: { id: session.id },
      data: { togglSyncError: message.slice(0, 500) },
    });
    return { ok: false, error: true, message };
  }
}

/**
 * Cierra en Toggl la entrada en curso del cronómetro y la vincula con la
 * TimeEntry que Kairas acaba de crear.
 *
 * Se envían start/stop/duration reales en lugar de un simple stop remoto: el
 * cronómetro de Kairas admite pausas y redondeo, así que la duración que
 * calcularía Toggl por su cuenta no coincidiría con la guardada.
 */
export async function stopRemoteTimer(
  remoteEntryId: string | null,
  remoteWorkspaceId: string | null,
  entryId: string,
): Promise<PushOutcome> {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { ok: false, skipped: "DELETED", message: SKIP_MESSAGES.DELETED };

  // Sin entrada remota previa (el arranque falló o Toggl no estaba
  // configurado): se crea ahora como entrada cerrada normal.
  if (!remoteEntryId) return pushTimeEntry(entryId);

  const ctx = await resolveContext();
  if (typeof ctx === "string") {
    await markFailed(entry.id, SKIP_MESSAGES[ctx], true);
    return { ok: false, skipped: ctx, message: SKIP_MESSAGES[ctx] };
  }

  const workspaceId = Number(remoteWorkspaceId ?? ctx.workspaceId);
  try {
    const remote = await ctx.client.updateTimeEntry(workspaceId, Number(remoteEntryId), {
      description: entry.title ?? "",
      start: toRfc3339(entry.startedAt),
      stop: entry.endedAt ? toRfc3339(entry.endedAt) : null,
      durationSeconds: entry.durationSeconds,
      billable: entry.billable,
    });
    await markSynced(entry.id, remote, workspaceId);
    return { ok: true, action: "stopped" };
  } catch (err) {
    const message = sanitizePushError(err);
    // La entrada local ya está guardada; solo queda pendiente de sincronizar.
    await prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        togglTimeEntryId: String(remoteEntryId),
        togglWorkspaceId: String(workspaceId),
        syncStatus: "pending",
        lastSyncError: message.slice(0, 500),
        lastSyncAttemptAt: new Date(),
        syncAttempts: { increment: 1 },
      },
    });
    return { ok: false, error: true, message };
  }
}

// ---------------------------------------------------------------------------
// Reintentos
// ---------------------------------------------------------------------------

export type RetrySummary = {
  attempted: number;
  synced: number;
  stillPending: number;
  failed: number;
  /** true si se paró antes de terminar por cuota de Toggl casi agotada. */
  stoppedByQuota: boolean;
};

/**
 * Reintenta las entradas nacidas en Kairas que no están sincronizadas.
 *
 * Solo toca `origin: kairas`: una entrada importada de Toggl nunca se re-empuja
 * (sería el bucle que la regla antiloop prohíbe).
 */
export async function retryPendingPushes(limit = 50): Promise<RetrySummary> {
  const pending = await prisma.timeEntry.findMany({
    where: {
      origin: "kairas",
      deletedAt: null,
      syncStatus: { in: ["pending", "error"] },
    },
    orderBy: { startedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const summary: RetrySummary = {
    attempted: pending.length,
    synced: 0,
    stillPending: 0,
    failed: 0,
    stoppedByQuota: false,
  };

  for (const { id } of pending) {
    const result = await pushTimeEntry(id);
    if (result.ok) summary.synced += 1;
    else if ("skipped" in result) summary.stillPending += 1;
    else summary.failed += 1;

    // Igual que en el import histórico: sin llamada extra, solo lee la cuota
    // que ya devolvió esta misma petición. Parar es mejor que encadenar 429.
    if (isTogglQuotaLow()) {
      summary.stoppedByQuota = true;
      break;
    }
  }
  return summary;
}

/** Número de entradas locales a la espera de subir a Toggl. */
export async function countPendingPushes(): Promise<number> {
  return prisma.timeEntry.count({
    where: {
      origin: "kairas",
      deletedAt: null,
      syncStatus: { in: ["pending", "error"] },
    },
  });
}

/**
 * Borra en Toggl la entrada en curso de un cronómetro descartado.
 *
 * Se usa desde `discardTimer`: en Kairas descartar no deja rastro, así que
 * tampoco debe dejar un cronómetro corriendo en Toggl.
 */
export async function deleteRemoteTimerEntry(
  remoteEntryId: string,
  remoteWorkspaceId: string | null,
): Promise<PushOutcome> {
  const ctx = await resolveContext();
  if (typeof ctx === "string") {
    return { ok: false, skipped: ctx, message: SKIP_MESSAGES[ctx] };
  }
  try {
    await ctx.client.deleteTimeEntry(
      Number(remoteWorkspaceId ?? ctx.workspaceId),
      Number(remoteEntryId),
    );
    return { ok: true, action: "deleted" };
  } catch (err) {
    const gone = err instanceof TogglApiError && err.code === "NOT_FOUND";
    if (gone) return { ok: true, action: "deleted" };
    return { ok: false, error: true, message: sanitizePushError(err) };
  }
}
