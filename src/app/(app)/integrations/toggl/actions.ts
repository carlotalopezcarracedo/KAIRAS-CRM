"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { parseMadridLocal } from "@/lib/dates";
import {
  checkTogglConnection,
  selectTogglWorkspace,
  type ConnectionCheckResult,
} from "@/server/services/toggl-connection-service";
import { runHistoricalImport, runReconciliation } from "@/server/services/toggl-sync-service";
import {
  refreshProjectMappings,
  confirmProjectMapping,
} from "@/server/services/toggl-mapping-service";
import {
  configureWebhook,
  pingWebhook,
  refreshWebhookStatus,
  removeWebhook,
  describeWebhookError,
} from "@/server/services/toggl-webhook-service";
import { pushTimeEntry, retryPendingPushes } from "@/server/services/toggl-push-service";
import { prisma } from "@/server/db/prisma";
import type { ActionResult } from "@/lib/action-result";

async function withUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }
}

/**
 * Administrar la integración Toggl (conexión, workspace, import, mapeo,
 * reconciliación, webhook) es una operación de todo el espacio de trabajo,
 * no un dato de una usuaria concreta. Reutiliza el campo `role` existente en
 * `User` — no se crea ningún sistema de permisos nuevo. Distinto de
 * "registrar tiempo", que sigue abierto a cualquier usuaria autenticada vía
 * `withUser()` (y a nivel de entrada individual, `retryEntrySyncAction`
 * comprueba además la propiedad de la fila).
 */
async function withOwner(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const auth = await withUser();
  if (!auth.ok) return auth;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (user?.role !== "owner") {
    return { ok: false, error: "Solo la propietaria puede administrar la integración con Toggl." };
  }
  return auth;
}

function revalidateTogglPaths() {
  revalidatePath("/integrations/toggl");
  revalidatePath("/integrations");
}

function friendlyServiceError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "NO_WORKSPACE") {
      return "Elige primero un workspace de Toggl (Comprobar conexión).";
    }
    if (err.message === "INVALID_RANGE") return "El rango de fechas no es válido.";
    if (err.message === "NOT_FOUND") return "Ese mapeo ya no existe.";
    if (err.message === "PROJECT_NOT_FOUND") return "Ese proyecto de Kairas ya no existe.";
  }
  return "Algo ha fallado. Inténtalo de nuevo.";
}

export async function checkConnectionAction(): Promise<
  ConnectionCheckResult | { ok: false; error: string }
> {
  const auth = await withOwner();
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await checkTogglConnection(auth.userId);
  revalidateTogglPaths();
  return result;
}

export async function selectWorkspaceAction(
  workspaceId: number,
  workspaceName: string,
): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;

  try {
    await selectTogglWorkspace(auth.userId, workspaceId, workspaceName);
  } catch (err) {
    console.error("[selectWorkspaceAction]", err);
    return { ok: false, error: "No se pudo guardar el workspace." };
  }

  revalidateTogglPaths();
  return { ok: true };
}

export async function importHistoricalAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;

  const fromRaw = String(formData.get("from") ?? "").trim();
  const toRaw = String(formData.get("to") ?? "").trim();
  if (!fromRaw || !toRaw) {
    return {
      ok: false,
      error: "Indica un rango de fechas.",
      fieldErrors: {
        from: fromRaw ? [] : ["Obligatorio"],
        to: toRaw ? [] : ["Obligatorio"],
      },
    };
  }

  const from = parseMadridLocal(fromRaw);
  const to = parseMadridLocal(toRaw + "T23:59:59");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return { ok: false, error: "El rango de fechas no es válido." };
  }

  try {
    await runHistoricalImport(auth.userId, { from, to });
  } catch (err) {
    console.error("[importHistoricalAction]", err);
    return { ok: false, error: friendlyServiceError(err) };
  }

  revalidateTogglPaths();
  return { ok: true };
}

export async function reconcileNowAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;

  try {
    await runReconciliation(auth.userId);
  } catch (err) {
    console.error("[reconcileNowAction]", err);
    return { ok: false, error: friendlyServiceError(err) };
  }

  revalidateTogglPaths();
  return { ok: true };
}

export async function refreshMappingsAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;

  try {
    await refreshProjectMappings(auth.userId);
  } catch (err) {
    console.error("[refreshMappingsAction]", err);
    return { ok: false, error: friendlyServiceError(err) };
  }

  revalidateTogglPaths();
  return { ok: true };
}

export async function confirmMappingAction(
  mappingId: string,
  kairasProjectId: string | null,
): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;

  try {
    await confirmProjectMapping(auth.userId, mappingId, kairasProjectId);
  } catch (err) {
    console.error("[confirmMappingAction]", err);
    return { ok: false, error: friendlyServiceError(err) };
  }

  revalidateTogglPaths();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Webhook Toggl -> Kairas
// ---------------------------------------------------------------------------

export async function configureWebhookAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;
  try {
    await configureWebhook(auth.userId);
  } catch (err) {
    console.error("[configureWebhookAction]", err);
    return { ok: false, error: describeWebhookError(err) };
  }
  revalidateTogglPaths();
  return { ok: true };
}

export async function pingWebhookAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;
  try {
    await pingWebhook(auth.userId);
  } catch (err) {
    console.error("[pingWebhookAction]", err);
    return { ok: false, error: describeWebhookError(err) };
  }
  revalidateTogglPaths();
  return { ok: true };
}

export async function refreshWebhookAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;
  try {
    await refreshWebhookStatus();
  } catch (err) {
    console.error("[refreshWebhookAction]", err);
    return { ok: false, error: describeWebhookError(err) };
  }
  revalidateTogglPaths();
  return { ok: true };
}

export async function removeWebhookAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;
  try {
    await removeWebhook(auth.userId);
  } catch (err) {
    console.error("[removeWebhookAction]", err);
    return { ok: false, error: describeWebhookError(err) };
  }
  revalidateTogglPaths();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reintentos de push Kairas -> Toggl
// ---------------------------------------------------------------------------

/** Reintenta una entrada concreta que quedó pendiente o con error. */
export async function retryEntrySyncAction(entryId: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  // Una usuaria solo puede reintentar entradas suyas; la propietaria, todas.
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    select: { userId: true, origin: true },
  });
  if (!entry) return { ok: false, error: "Esa entrada ya no existe." };
  if (user?.role !== "owner" && entry.userId !== auth.userId) {
    return { ok: false, error: "No puedes sincronizar entradas de otra persona." };
  }
  if (entry.origin !== "kairas") {
    return { ok: false, error: "Esa entrada procede de Toggl; no se reenvía." };
  }

  try {
    const result = await pushTimeEntry(entryId);
    if (!result.ok) return { ok: false, error: result.message };
  } catch (err) {
    console.error("[retryEntrySyncAction]", err);
    return { ok: false, error: "No se ha podido sincronizar con Toggl." };
  }

  revalidatePath("/time");
  revalidateTogglPaths();
  return { ok: true };
}

/** Reintenta en lote todo lo que quedó sin subir. */
export async function retryPendingSyncAction(): Promise<ActionResult> {
  const auth = await withOwner();
  if (!auth.ok) return auth;
  try {
    const summary = await retryPendingPushes();
    if (summary.stoppedByQuota) {
      console.warn(
        "[retryPendingSyncAction] parado por cuota de Toggl casi agotada:",
        summary,
      );
    }
  } catch (err) {
    console.error("[retryPendingSyncAction]", err);
    return { ok: false, error: "No se han podido reintentar las pendientes." };
  }
  revalidatePath("/time");
  revalidateTogglPaths();
  return { ok: true };
}
