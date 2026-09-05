import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { addDays } from "@/lib/dates";
import { LOCKED_STATUSES } from "@/server/services/time-service";
import {
  TogglClient,
  isTogglQuotaLow,
  getLastTogglQuota,
  type TogglTimeEntry,
} from "@/integrations/toggl/adapter";
import { TogglReportsClient, TogglReportsError } from "@/integrations/toggl/reports-adapter";
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
  /** Solo relevante en historical_import: hay ventanas que se pueden reintentar. */
  resumable: boolean;
  /** Ventanas fuera del histórico que permite la cuenta/plan de Toggl (permanente, no se reintentan). */
  unreachableWindows: number;
  /** Ventanas nunca intentadas (se paró antes de llegar) + con error puntual. */
  pendingWindows: number;
  quotaResetsInSeconds: number | null;
  quotaObservedAt: string | null;
} & Totals;

type WindowState = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: "pending" | "success" | "error" | "unreachable";
  reason?: "quota" | "other";
  error?: string;
  itemsReceived?: number;
};

type ImportRunSummary = {
  windows: WindowState[];
  quota?: { remaining: number; resetsInSeconds: number; observedAt: string } | null;
};

function isImportRunSummary(value: unknown): value is ImportRunSummary {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { windows?: unknown }).windows)
  );
}

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
  summary: unknown;
  startedAt: Date;
  finishedAt: Date | null;
}): TogglSyncRunSummary {
  const parsed = isImportRunSummary(run.summary) ? run.summary : null;
  const windows = parsed?.windows ?? [];
  const pendingWindows = windows.filter((w) => w.status === "pending" || w.status === "error").length;
  const unreachableWindows = windows.filter((w) => w.status === "unreachable").length;
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
    resumable: pendingWindows > 0,
    unreachableWindows,
    pendingWindows,
    quotaResetsInSeconds: parsed?.quota?.resetsInSeconds ?? null,
    quotaObservedAt: parsed?.quota?.observedAt ?? null,
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

function buildWindows(from: Date, to: Date): WindowState[] {
  const windows: WindowState[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const windowEnd = new Date(
      Math.min(addDays(cursor, IMPORT_WINDOW_DAYS - 1).getTime(), to.getTime()),
    );
    windows.push({ from: toDateParam(cursor), to: toDateParam(windowEnd), status: "pending" });
    cursor = addDays(windowEnd, 1);
  }
  return windows;
}

/**
 * Descarga y aplica una ventana. Nunca lanza: el resultado clasifica el
 * motivo del fallo para que el bucle de arriba decida qué hacer (parar,
 * marcar como no alcanzable, o seguir con la siguiente).
 *
 * Usa el Reports API (no Track API) para TODO el rango del import histórico:
 * Track API v9 rechaza con HTTP 400 cualquier `start_date` anterior a un
 * límite de cuenta/plan que avanza con el tiempo (visto en producción), y
 * partir una ventana justo en esa frontera móvil es frágil. El Reports API no
 * mostró ese límite en las pruebas reales (rangos recientes y de más de un
 * año, ver auditoría), así que usarlo de forma uniforme elimina el problema
 * de raíz en vez de parchearlo. Track API sigue siendo la única vía para
 * reconciliación, webhooks, cronómetro y push -- aquí no cambia nada de eso.
 */
async function processWindow(
  client: TogglReportsClient,
  workspaceId: number,
  actorId: string,
  win: { from: string; to: string },
  totals: Totals,
): Promise<{ outcome: "success" | "quota" | "unreachable" | "error"; message?: string; itemsReceived: number }> {
  try {
    const entries = await client.getDetailedTimeEntries({
      workspaceId,
      startDate: win.from,
      endDate: win.to,
    });
    for (const entry of entries) {
      try {
        const result = await applyRemoteEntry(entry, actorId);
        bump(totals, result);
      } catch {
        totals.itemsError += 1;
      }
    }
    totals.itemsReceived += entries.length;
    return { outcome: "success", itemsReceived: entries.length };
  } catch (err) {
    if (err instanceof TogglReportsError && err.code === "RATE_LIMITED") {
      return { outcome: "quota", message: err.message, itemsReceived: 0 };
    }
    // El plan de Toggl no admite Reports API para este workspace: no es
    // transitorio, reintentar la misma ventana no lo va a resolver.
    if (err instanceof TogglReportsError && err.code === "FORBIDDEN") {
      return { outcome: "unreachable", message: err.message, itemsReceived: 0 };
    }
    return { outcome: "error", message: describeTogglError(err), itemsReceived: 0 };
  }
}

/**
 * Recorre las ventanas pendientes/con error (nunca las ya resueltas:
 * "success" y "unreachable" no se vuelven a pedir). Muta `windows` in place.
 *
 * Cuota agotada (429/402 real, o el aviso preventivo de `isTogglQuotaLow()`):
 * para inmediatamente. Las ventanas todavía no intentadas quedan tal cual (no
 * se cuentan como error una a una) para poder reanudar después.
 *
 * El aviso preventivo SOLO se aplica a partir de la segunda ventana de ESTA
 * misma ejecución: `isTogglQuotaLow()` lee un estado en memoria del proceso
 * que puede venir de una operación anterior ya vieja (otra importación, un
 * push, etc.). Fiarse de esa lectura para la primera ventana bloquearía para
 * siempre la primera ventana de cada reanudación aunque la cuota de Toggl ya
 * se hubiera restablecido -- por eso la primera ventana de cada ejecución
 * SIEMPRE se intenta de verdad; si de verdad sigue agotada, la propia
 * respuesta (429/402) lo confirma y pausa igualmente, sin gastar más de una
 * llamada de más.
 */
async function runImportWindows(
  actorId: string,
  workspaceId: number,
  windows: WindowState[],
  totals: Totals,
): Promise<{ stoppedByQuota: boolean }> {
  const client = new TogglReportsClient();
  let stoppedByQuota = false;
  let madeRealCallThisRun = false;

  for (const w of windows) {
    if (w.status === "success" || w.status === "unreachable") continue;

    // Ninguna llamada adicional solo para consultar cuota: esto reutiliza la
    // que ya devolvió la última petición real DE ESTA MISMA ejecución.
    if (madeRealCallThisRun && isTogglQuotaLow()) {
      stoppedByQuota = true;
      break;
    }

    const result = await processWindow(client, workspaceId, actorId, { from: w.from, to: w.to }, totals);
    madeRealCallThisRun = true;
    if (result.outcome === "success") {
      w.status = "success";
      w.itemsReceived = result.itemsReceived;
      w.error = undefined;
      w.reason = undefined;
    } else if (result.outcome === "unreachable") {
      w.status = "unreachable";
      w.error = result.message;
    } else if (result.outcome === "quota") {
      w.status = "error";
      w.reason = "quota";
      w.error = result.message;
      stoppedByQuota = true;
      break;
    } else {
      w.status = "error";
      w.reason = "other";
      w.error = result.message;
      // Error puntual de esta ventana: se sigue con la siguiente.
    }
  }

  return { stoppedByQuota };
}

/**
 * Estado semántico del run:
 * - success: todas las ventanas se completaron limpias.
 * - partial: hubo progreso real (al menos una ventana con éxito) pero queda
 *   algo sin resolver (pendiente/con error reintentable) o permanentemente
 *   fuera de alcance. No es un fallo: parte de lo pedido SÍ se importó.
 * - error: ninguna ventana llegó a completarse -- puede seguir siendo
 *   reanudable (ver `resumable` en `mapRun`), pero no hay progreso que mostrar
 *   como "parcial".
 */
function summarizeImportRun(windows: WindowState[]): {
  status: TogglSyncRunStatus;
  message: string | null;
} {
  const successCount = windows.filter((w) => w.status === "success").length;
  const unreachableCount = windows.filter((w) => w.status === "unreachable").length;
  const pendingCount = windows.filter((w) => w.status === "pending").length;
  const errorWindows = windows.filter((w) => w.status === "error");
  const quotaErrorCount = errorWindows.filter((w) => w.reason === "quota").length;
  const otherErrorCount = errorWindows.length - quotaErrorCount;

  if (successCount === windows.length) {
    return { status: "success", message: null };
  }

  const parts: string[] = [];
  if (pendingCount + quotaErrorCount > 0) {
    parts.push(
      `Importación pausada por límite de cuota de Toggl. Quedan ${pendingCount + quotaErrorCount} ventana(s) por reintentar.`,
    );
  }
  if (otherErrorCount > 0) {
    parts.push(`${otherErrorCount} ventana(s) con error (no relacionado con cuota); se pueden reintentar.`);
  }
  if (unreachableCount > 0) {
    parts.push(
      `${unreachableCount} ventana(s) que tu plan de Toggl no permite consultar por Reports API (no se reintentan).`,
    );
  }
  if (parts.length === 0) parts.push("No se ha podido importar nada.");

  return { status: successCount > 0 ? "partial" : "error", message: parts.join(" ") };
}

/** Cierra el run: aplica ventanas pendientes/con error, persiste y avanza el cursor si procede. */
async function finishImportRun(
  actorId: string,
  workspaceId: number,
  runId: string,
  windowFrom: Date | null,
  windows: WindowState[],
  totals: Totals,
): Promise<TogglSyncRunSummary> {
  await runImportWindows(actorId, workspaceId, windows, totals);
  const { status, message } = summarizeImportRun(windows);
  const quota = getLastTogglQuota();

  const summary: ImportRunSummary = {
    windows,
    quota: quota
      ? { remaining: quota.remaining, resetsInSeconds: quota.resetsInSeconds, observedAt: quota.observedAt.toISOString() }
      : null,
  };

  const finished = await prisma.togglSyncRun.update({
    where: { id: runId },
    data: { status, finishedAt: new Date(), ...totals, error: message, summary },
  });

  // El cursor de reconciliación solo avanza con una importación totalmente
  // limpia (success puro): un run parcial podría dejar huecos que la
  // reconciliación ya no volvería a cubrir si el cursor avanzara igual.
  const importSettingsPatch: Parameters<typeof patchTogglSettings>[0] = {
    lastImportAt: new Date().toISOString(),
  };
  if (status === "success" && windowFrom && finished.windowTo) {
    const importEndUnix = Math.floor(finished.windowTo.getTime() / 1000);
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
    entityId: runId,
    metadata: totals,
  });

  return mapRun(finished);
}

/**
 * Importación histórica por ventanas (por defecto mensuales), vía el Reports
 * API (ver `reports-adapter.ts`) para TODO el rango pedido -- no solo la
 * parte "antigua". Totalmente idempotente: repetirla no duplica nada (upsert
 * por togglTimeEntryId, misma `applyRemoteEntry` que usan reconciliación y
 * webhooks).
 *
 * Cada ventana se clasifica al fallar: cuota agotada (pausa el run entero,
 * reanudable), plan de Toggl sin acceso a Reports API (esa ventana concreta
 * nunca se reintenta, es un límite permanente de la cuenta), o un error
 * puntual (se reintenta más tarde). Lo ya importado nunca se pierde.
 */
export async function runHistoricalImport(
  actorId: string,
  range: { from: Date; to: Date },
): Promise<TogglSyncRunSummary> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");
  if (range.to < range.from) throw new Error("INVALID_RANGE");

  const windows = buildWindows(range.from, range.to);
  const run = await prisma.togglSyncRun.create({
    data: {
      kind: "historical_import",
      status: "running",
      windowFrom: range.from,
      windowTo: range.to,
    },
  });

  return finishImportRun(actorId, settings.workspaceId, run.id, range.from, windows, zeroTotals());
}

/**
 * Reanuda el import histórico parcial más reciente: solo reintenta las
 * ventanas "pending" (nunca intentadas, se paró por cuota) o "error"
 * (fallo puntual). Las "success" y "unreachable" no se vuelven a pedir.
 */
export async function continueHistoricalImport(actorId: string): Promise<TogglSyncRunSummary> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");

  // Reanudable no depende del enum de estado: un run que no importó NADA
  // (status "error") es tan reanudable como uno "partial" con progreso real.
  const run = await prisma.togglSyncRun.findFirst({
    where: { kind: "historical_import", status: { in: ["error", "partial"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!run) throw new Error("NO_RESUMABLE_IMPORT");

  const parsed = isImportRunSummary(run.summary) ? run.summary : null;
  const windows = parsed?.windows ?? [];
  if (!windows.some((w) => w.status === "pending" || w.status === "error")) {
    throw new Error("NOTHING_TO_RESUME");
  }

  const totals: Totals = {
    itemsReceived: run.itemsReceived,
    itemsCreated: run.itemsCreated,
    itemsUpdated: run.itemsUpdated,
    itemsUnchanged: run.itemsUnchanged,
    itemsUnassigned: run.itemsUnassigned,
    itemsDeleted: run.itemsDeleted,
    itemsError: run.itemsError,
  };

  await prisma.togglSyncRun.update({ where: { id: run.id }, data: { status: "running" } });

  return finishImportRun(actorId, settings.workspaceId, run.id, run.windowFrom, windows, totals);
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
