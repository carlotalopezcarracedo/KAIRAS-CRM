import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { addDays } from "@/lib/dates";
import { LOCKED_STATUSES } from "@/server/services/time-service";
import { TogglClient, isTogglQuotaLow, type TogglTimeEntry } from "@/integrations/toggl/adapter";
import {
  getTogglSettings,
  patchTogglSettings,
  describeTogglError,
} from "@/server/services/toggl-connection-service";
import type {
  TogglSyncKind,
  TogglSyncRunStatus,
  TimeEntryStatus,
  TimerSession,
} from "@prisma/client";

/**
 * Núcleo de sincronización Toggl -> Kairas (pull). Import histórico y
 * reconciliación manual comparten exactamente esta misma función de
 * aplicación por entrada: es la única vía de escritura de este sentido, y
 * NUNCA llama a nada que escriba hacia Toggl (evita loops por construcción,
 * no solo por convención).
 */

type ApplyAction = "created" | "updated" | "unchanged" | "deleted" | "conflict";
export type ApplyResult = { action: ApplyAction; unassigned: boolean };

type Totals = {
  itemsReceived: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsUnassigned: number;
  itemsDeleted: number;
  itemsError: number;
};

function zeroTotals(): Totals {
  return {
    itemsReceived: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsUnchanged: 0,
    itemsUnassigned: 0,
    itemsDeleted: 0,
    itemsError: 0,
  };
}

function bump(totals: Totals, result: ApplyResult) {
  if (result.action === "created") totals.itemsCreated += 1;
  else if (result.action === "updated") totals.itemsUpdated += 1;
  else if (result.action === "unchanged") totals.itemsUnchanged += 1;
  else if (result.action === "deleted") totals.itemsDeleted += 1;
  else if (result.action === "conflict") totals.itemsError += 1;

  if (result.unassigned && result.action !== "deleted" && result.action !== "conflict") {
    totals.itemsUnassigned += 1;
  }
}

async function resolveKairasProject(
  togglProjectId: number | null,
): Promise<{ projectId: string | null; clientId: string | null; unassigned: boolean }> {
  if (!togglProjectId) return { projectId: null, clientId: null, unassigned: false };

  const mapping = await prisma.togglProjectMapping.findUnique({
    where: { togglProjectId: String(togglProjectId) },
  });
  if (!mapping?.kairasProjectId) return { projectId: null, clientId: null, unassigned: true };

  const project = await prisma.project.findFirst({
    where: { id: mapping.kairasProjectId, deletedAt: null },
    select: { clientId: true },
  });
  // El proyecto Kairas del mapping ya no existe (se archivó/borró): trátalo
  // como sin asignar en vez de fallar el import completo.
  if (!project) return { projectId: null, clientId: null, unassigned: true };

  return { projectId: mapping.kairasProjectId, clientId: project.clientId, unassigned: false };
}

/**
 * Cronómetro activo: hay UNA sola abstracción de "hay un timer corriendo" en
 * todo Kairas, y es `TimerSession` (la misma que usa `startTimer`/`stopTimer`
 * nativos). Una entrada de Toggl con `stop == null` se refleja aquí, NUNCA
 * como una TimeEntry con `endedAt: null` — tener dos representaciones
 * distintas de "en curso" es exactamente lo que haría que el widget del
 * cronómetro (que solo lee TimerSession) no se enterara de un timer
 * arrancado desde Toggl.
 */
async function applyRunningEntry(entry: TogglTimeEntry, actorId: string): Promise<ApplyResult> {
  const togglTimeEntryId = String(entry.id);
  const { projectId, clientId, unassigned } = await resolveKairasProject(entry.projectId);

  const trackedSession = await prisma.timerSession.findFirst({ where: { togglTimeEntryId } });
  if (trackedSession) {
    // Refresco idempotente de metadatos. No hay comparación de "más reciente
    // gana": una sesión en curso no tiene aún nada facturado que proteger, y
    // el coste de sobreescribir con el último estado de Toggl es nulo.
    await prisma.timerSession.update({
      where: { id: trackedSession.id },
      data: {
        currentTitle: entry.description || null,
        billable: entry.billable,
        clientId,
        projectId,
        togglWorkspaceId: String(entry.workspaceId),
        togglSyncError: null,
      },
    });
    return { action: "unchanged", unassigned };
  }

  // Ya hay un cronómetro activo (nativo de Kairas, o de otra entrada de
  // Toggl) para esta usuaria: no se sustituye solo -- sería perder de vista
  // cuál de los dos es "el" cronómetro y arriesgar los datos del que ya
  // estaba corriendo. Se marca como conflicto; en cuanto esa entrada de
  // Toggl se pare, entrará por la vía normal de entrada cerrada.
  const activeSession = await prisma.timerSession.findFirst({
    where: { userId: actorId, active: true },
  });
  if (activeSession) {
    return { action: "conflict", unassigned };
  }

  await prisma.timerSession.create({
    data: {
      userId: actorId,
      active: true,
      startedAt: new Date(entry.start),
      currentTitle: entry.description || null,
      billable: entry.billable,
      clientId,
      projectId,
      togglTimeEntryId,
      togglWorkspaceId: String(entry.workspaceId),
    },
  });
  return { action: "created", unassigned };
}

/**
 * Una entrada que Kairas tenía como TimerSession (en curso) ahora llega
 * parada desde Toggl: se cierra exactamente igual que `stopTimer` nativo
 * (crea la TimeEntry, borra la sesión), pero sin pasar por el servicio de
 * push -- este es el lado de entrada, nunca debe escribir hacia Toggl.
 */
async function finalizeSessionAsEntry(
  session: TimerSession,
  entry: TogglTimeEntry,
): Promise<ApplyResult> {
  const { projectId, clientId, unassigned } = await resolveKairasProject(entry.projectId);
  const durationSeconds = Math.max(0, Math.round(entry.durationSeconds));
  const status: TimeEntryStatus = entry.billable ? "draft" : "non_billable";

  try {
    await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          userId: session.userId,
          title: entry.description || null,
          origin: "toggl",
          source: "toggl_import",
          togglTimeEntryId: String(entry.id),
          togglWorkspaceId: String(entry.workspaceId),
          togglProjectId: entry.projectId ? String(entry.projectId) : null,
          togglUpdatedAt: new Date(entry.updatedAt),
          syncStatus: "synced",
          lastSyncedAt: new Date(),
          startedAt: new Date(entry.start),
          endedAt: entry.stop ? new Date(entry.stop) : new Date(),
          durationSeconds,
          billable: entry.billable,
          // Nace en Toggl: sigue el valor remoto hasta que alguien la edite
          // desde Kairas (ver política de billable en applyRemoteEntry).
          billableLocal: false,
          status,
          clientId,
          projectId,
        },
      }),
      prisma.timerSession.delete({ where: { id: session.id } }),
    ]);
  } catch {
    // Entrega duplicada casi simultánea (webhook + reconciliación solapados):
    // la otra ya habrá creado la TimeEntry y borrado la sesión. La siguiente
    // vuelta de applyRemoteEntry para este id encontrará la TimeEntry ya
    // creada y seguirá por la vía normal de upsert, de forma idempotente.
    return { action: "conflict", unassigned };
  }
  return { action: "created", unassigned };
}

/**
 * Aplica una TimeEntry de Toggl contra Kairas de forma idempotente
 * (upsert por `togglTimeEntryId`). `actorId` solo se usa como propietaria de
 * las filas NUEVAS creadas por el import (single-user: quien lanza el
 * import/reconciliación es la dueña de las horas).
 */
export async function applyRemoteEntry(
  entry: TogglTimeEntry,
  actorId: string,
): Promise<ApplyResult> {
  const togglTimeEntryId = String(entry.id);

  // --- Eliminada en Toggl (solo llega marcada así en peticiones con since=) ---
  if (entry.deletedAt) {
    // Si estaba en curso (TimerSession), se descarta sin dejar rastro -- igual
    // que `discardTimer` nativo.
    const trackedSession = await prisma.timerSession.findFirst({ where: { togglTimeEntryId } });
    if (trackedSession) {
      await prisma.timerSession.delete({ where: { id: trackedSession.id } });
      return { action: "deleted", unassigned: false };
    }

    const existing = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId } });
    if (!existing || existing.deletedAt) return { action: "unchanged", unassigned: false };

    if (existing.lockedAt || LOCKED_STATUSES.includes(existing.status)) {
      await prisma.timeEntry.update({
        where: { id: existing.id },
        data: {
          syncStatus: "error",
          lastSyncError:
            "Eliminada en Toggl, pero bloqueada en Kairas (en cola de factura o facturada); no se ha borrado.",
          lastSyncedAt: new Date(),
        },
      });
      return { action: "conflict", unassigned: false };
    }

    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        syncStatus: "synced",
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    });
    return { action: "deleted", unassigned: false };
  }

  // --- En curso: una sola abstracción de "cronómetro activo" (TimerSession) ---
  if (entry.running) {
    return applyRunningEntry(entry, actorId);
  }

  // --- Cerrada, pero puede ser la continuación de un TimerSession que se paró ---
  const trackedSession = await prisma.timerSession.findFirst({ where: { togglTimeEntryId } });
  if (trackedSession) {
    return finalizeSessionAsEntry(trackedSession, entry);
  }

  const existing = await prisma.timeEntry.findUnique({ where: { togglTimeEntryId } });

  const { projectId, clientId, unassigned } = await resolveKairasProject(entry.projectId);
  const durationSeconds = Math.max(0, Math.round(entry.durationSeconds));
  const togglUpdatedAt = new Date(entry.updatedAt);

  if (!existing) {
    const status: TimeEntryStatus = entry.billable ? "draft" : "non_billable";
    await prisma.timeEntry.create({
      data: {
        userId: actorId,
        origin: "toggl",
        source: "toggl_import",
        togglTimeEntryId,
        title: entry.description || null,
        startedAt: new Date(entry.start),
        endedAt: entry.stop ? new Date(entry.stop) : null,
        durationSeconds,
        billable: entry.billable,
        // Nace en Toggl: sigue el valor remoto hasta que alguien la edite
        // desde Kairas.
        billableLocal: false,
        status,
        clientId,
        projectId,
        togglWorkspaceId: String(entry.workspaceId),
        togglProjectId: entry.projectId ? String(entry.projectId) : null,
        togglUpdatedAt,
        syncStatus: "synced",
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    });
    return { action: "created", unassigned };
  }

  if (existing.deletedAt) {
    // Se borró en Kairas y Toggl trae un cambio posterior: no se resucita
    // sola, queda como conflicto para revisión manual.
    if (existing.syncStatus !== "error") {
      await prisma.timeEntry.update({
        where: { id: existing.id },
        data: {
          syncStatus: "error",
          lastSyncError: "Editada en Toggl después de eliminarse en Kairas; revísala manualmente.",
          lastSyncedAt: new Date(),
        },
      });
    }
    return { action: "conflict", unassigned };
  }

  // Idempotencia real: si Toggl no tiene nada más reciente que lo que ya
  // tenemos, no se reescribe (evita "actualizar" en cada reintento/reconciliación).
  if (existing.togglUpdatedAt && existing.togglUpdatedAt.getTime() >= togglUpdatedAt.getTime()) {
    return { action: "unchanged", unassigned };
  }

  if (existing.lockedAt || LOCKED_STATUSES.includes(existing.status)) {
    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        syncStatus: "error",
        lastSyncError:
          "Cambio recibido de Toggl, pero la entrada está bloqueada (en cola de factura o facturada); no se ha aplicado.",
        lastSyncedAt: new Date(),
      },
    });
    return { action: "conflict", unassigned };
  }

  // Política de billable: si la fila está protegida localmente (nació en
  // Kairas, o alguien la editó desde Kairas después), el valor remoto NUNCA
  // la toca -- ni siquiera al actualizar descripción/fechas/tags. Sin esto,
  // reconciliar pisaría silenciosamente un billable=true de Kairas con el
  // false que devuelve un workspace de Toggl sin esa función en su plan.
  const effectiveBillable = existing.billableLocal ? existing.billable : entry.billable;
  const status: TimeEntryStatus = effectiveBillable ? "draft" : "non_billable";

  await prisma.timeEntry.update({
    where: { id: existing.id },
    data: {
      title: entry.description || null,
      startedAt: new Date(entry.start),
      endedAt: entry.stop ? new Date(entry.stop) : null,
      durationSeconds,
      billable: effectiveBillable,
      status,
      clientId,
      projectId,
      togglWorkspaceId: String(entry.workspaceId),
      togglProjectId: entry.projectId ? String(entry.projectId) : null,
      togglUpdatedAt,
      syncStatus: "synced",
      lastSyncedAt: new Date(),
      lastSyncError: null,
    },
  });
  return { action: "updated", unassigned };
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type TogglSyncRunSummary = {
  id: string;
  kind: TogglSyncKind;
  status: TogglSyncRunStatus;
  windowFrom: Date | null;
  windowTo: Date | null;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
} & Totals;

function mapRun(run: {
  id: string;
  kind: TogglSyncKind;
  status: TogglSyncRunStatus;
  windowFrom: Date | null;
  windowTo: Date | null;
  itemsReceived: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsUnassigned: number;
  itemsDeleted: number;
  itemsError: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}): TogglSyncRunSummary {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    windowFrom: run.windowFrom,
    windowTo: run.windowTo,
    itemsReceived: run.itemsReceived,
    itemsCreated: run.itemsCreated,
    itemsUpdated: run.itemsUpdated,
    itemsUnchanged: run.itemsUnchanged,
    itemsUnassigned: run.itemsUnassigned,
    itemsDeleted: run.itemsDeleted,
    itemsError: run.itemsError,
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}

const IMPORT_WINDOW_DAYS = 31;

/**
 * Margen de seguridad de la reconciliación, en segundos. Se resta al cursor
 * SOLO para construir el `since=` de la petición (nunca se persiste), para
 * cubrir una carrera de pocos minutos justo en el borde de la última
 * sincronización. Nunca representa días ni meses -- eso es exclusivo de la
 * importación histórica explícita.
 */
const RECONCILE_OVERLAP_SECONDS = 5 * 60;

/**
 * Importación histórica por ventanas (por defecto mensuales) desde
 * `GET /me/time_entries`. Totalmente idempotente: repetirla no duplica nada
 * (upsert por togglTimeEntryId). Si una ventana falla, se registra el error
 * y se continúa con la siguiente — lo ya importado no se pierde.
 */
export async function runHistoricalImport(
  actorId: string,
  range: { from: Date; to: Date },
): Promise<TogglSyncRunSummary> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");
  if (range.to < range.from) throw new Error("INVALID_RANGE");

  const run = await prisma.togglSyncRun.create({
    data: {
      kind: "historical_import",
      status: "running",
      windowFrom: range.from,
      windowTo: range.to,
    },
  });

  const client = new TogglClient();
  const totals = zeroTotals();
  const windowErrors: { from: string; to: string; error: string }[] = [];

  let cursor = new Date(range.from);
  while (cursor <= range.to) {
    const windowEnd = new Date(
      Math.min(addDays(cursor, IMPORT_WINDOW_DAYS - 1).getTime(), range.to.getTime()),
    );

    try {
      const entries = await client.getTimeEntries({
        startDate: toDateParam(cursor),
        endDate: toDateParam(windowEnd),
      });
      totals.itemsReceived += entries.length;

      for (const entry of entries) {
        try {
          const result = await applyRemoteEntry(entry, actorId);
          bump(totals, result);
        } catch (err) {
          totals.itemsError += 1;
          windowErrors.push({
            from: toDateParam(cursor),
            to: toDateParam(windowEnd),
            error: err instanceof Error ? err.message : "Error al aplicar una entrada",
          });
        }
      }
    } catch (err) {
      totals.itemsError += 1;
      windowErrors.push({
        from: toDateParam(cursor),
        to: toDateParam(windowEnd),
        error: describeTogglError(err),
      });
      // Se continúa con la siguiente ventana: lo ya importado se conserva.
    }

    cursor = addDays(windowEnd, 1);

    // No hace ninguna llamada extra: aprovecha la cuota que ya devolvió la
    // última petición real. Parar aquí es mejor que seguir y que la próxima
    // ventana falle a medias por un 429.
    if (cursor <= range.to && isTogglQuotaLow()) {
      windowErrors.push({
        from: toDateParam(cursor),
        to: toDateParam(range.to),
        error: "Detenido por cuota de Toggl casi agotada. Vuelve a intentarlo cuando se reinicie.",
      });
      break;
    }
  }

  const status: TogglSyncRunStatus = windowErrors.length > 0 ? "error" : "success";
  // El mensaje de nivel superior distingue "cuota agotada" (parada
  // deliberada, se reanuda sola en el próximo intento) de errores reales de
  // ventana, en vez de un genérico "N ventana(s) con error" para ambos casos.
  const stoppedByQuota = windowErrors.some((w) => w.error.includes("cuota"));
  const errorMessage = stoppedByQuota
    ? windowErrors[windowErrors.length - 1]!.error
    : windowErrors.length
      ? `${windowErrors.length} ventana(s) con error`
      : null;
  const finished = await prisma.togglSyncRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      ...totals,
      error: errorMessage,
      summary: windowErrors.length ? { windowErrors } : undefined,
    },
  });

  const importSettingsPatch: Parameters<typeof patchTogglSettings>[0] = {
    lastImportAt: new Date().toISOString(),
  };
  // Deja el cursor de reconciliación coherente con lo que ya se acaba de
  // importar, sin romperlo: solo avanza (nunca hacia atrás, por si el rango
  // importado es antiguo) y solo si la importación entera fue limpia -- una
  // ventana en error podría dejar huecos sin traer, y avanzar el cursor
  // haría que la reconciliación ya no los cubriera nunca.
  if (status === "success") {
    const importEndUnix = Math.floor(range.to.getTime() / 1000);
    const settingsNow = await getTogglSettings();
    if (!settingsNow.lastReconciledAt || importEndUnix > settingsNow.lastReconciledAt) {
      importSettingsPatch.lastReconciledAt = importEndUnix;
    }
  }
  await patchTogglSettings(importSettingsPatch);

  await audit({
    actorId,
    action: "import",
    entityType: "TogglSyncRun",
    entityId: run.id,
    metadata: totals,
  });

  return mapRun(finished);
}

/**
 * Reconciliación manual ("Sincronizar ahora") vía `?since=`. Guarda el
 * cursor solo si TODO el proceso (descarga + aplicación de cada entrada)
 * terminó sin errores; si algo falla, el cursor no avanza y la próxima
 * ejecución vuelve a pedir la misma ventana (idempotente, no hay huecos).
 */
export async function runReconciliation(actorId: string): Promise<TogglSyncRunSummary> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");

  const runStartedUnix = Math.floor(Date.now() / 1000);
  // Reconciliación e importación histórica son conceptos separados a
  // propósito (ver runHistoricalImport): la reconciliación SOLO trae cambios
  // posteriores al punto de sincronización, nunca histórico por su cuenta.
  //
  // Sin cursor previo (instalación nueva, o nadie ha reconciliado ni
  // importado histórico todavía) el cursor arranca "ahora", no "hace 90
  // días" -- si se quiere histórico, la vía es el import explícito, que además
  // deja aquí guardado su propio punto de corte al terminar con éxito.
  const cursor = settings.lastReconciledAt ?? runStartedUnix;
  // El "since=" de la petición sí resta un margen pequeño (nunca el cursor
  // persistido) para no perder por una carrera de segundos justo en el borde.
  const sinceParam = cursor - RECONCILE_OVERLAP_SECONDS;

  const run = await prisma.togglSyncRun.create({
    data: { kind: "reconciliation", status: "running", sinceParam },
  });

  const client = new TogglClient();
  const totals = zeroTotals();
  let fetchError: string | null = null;

  try {
    const entries = await client.getTimeEntries({ since: sinceParam });
    totals.itemsReceived = entries.length;

    for (const entry of entries) {
      try {
        const result = await applyRemoteEntry(entry, actorId);
        bump(totals, result);
      } catch {
        totals.itemsError += 1;
      }
    }
  } catch (err) {
    fetchError = describeTogglError(err);
  }

  const ok = !fetchError && totals.itemsError === 0;
  const finished = await prisma.togglSyncRun.update({
    where: { id: run.id },
    data: {
      status: ok ? "success" : "error",
      finishedAt: new Date(),
      error: fetchError,
      ...totals,
    },
  });

  if (ok) await patchTogglSettings({ lastReconciledAt: runStartedUnix });

  await audit({
    actorId,
    action: "sync",
    entityType: "TogglSyncRun",
    entityId: run.id,
    metadata: { ...totals, error: fetchError, cursorAdvanced: ok },
  });

  return mapRun(finished);
}

export async function listSyncRuns(limit = 20): Promise<TogglSyncRunSummary[]> {
  const runs = await prisma.togglSyncRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return runs.map(mapRun);
}
