/**
 * Ciclo de vida de la suscripción de webhooks Toggl -> Kairas.
 *
 * Aquí NO se procesa ningún evento: eso ocurre en la ruta pública, que llama a
 * `applyRemoteEntry`. Este servicio solo crea, consulta, valida y borra la
 * suscripción, y mantiene su estado visible en Integraciones.
 */
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import {
  TogglWebhookClient,
  TogglWebhookError,
  TOGGL_SUBSCRIPTION_DESCRIPTION,
  type TogglSubscription,
} from "@/integrations/toggl/webhooks";
import {
  getTogglSettings,
  patchTogglSettings,
  type TogglWebhookStatus,
} from "@/server/services/toggl-connection-service";

export type WebhookStatusView = {
  status: TogglWebhookStatus;
  subscriptionId: number | null;
  callbackUrl: string | null;
  expectedCallbackUrl: string | null;
  validatedAt: string | null;
  lastEventAt: string | null;
  /** Última entrega que se aplicó sin error; null si la más reciente falló. */
  lastSuccessAt: string | null;
  /** "time_entry.updated", etc. Se extrae del sobre guardado, nunca se expone el payload. */
  lastEventType: string | null;
  lastError: string | null;
  secretConfigured: boolean;
  appUrlConfigured: boolean;
  /** Fijos por construcción: son los que `createSubscription` siempre pide. */
  eventFilters: string[];
};

/** Filtros que `TogglWebhookClient.createSubscription` solicita siempre. */
const CONFIGURED_EVENT_FILTERS = [
  "time_entry.created",
  "time_entry.updated",
  "time_entry.deleted",
];

/**
 * Extrae solo el tipo de evento del último sobre guardado (p.ej.
 * "time_entry.updated"). Nunca devuelve el payload: ni descripción, ni
 * cliente, ni ningún dato de negocio.
 */
function lastEventTypeFrom(envelope: string | null): string | null {
  if (!envelope) return null;
  try {
    const data = JSON.parse(envelope) as {
      metadata?: { model?: string; action?: string };
      event_type?: string;
    };
    const model = data.metadata?.model ?? data.event_type?.split(".")[0];
    const action = data.metadata?.action ?? data.event_type?.split(".")[1];
    if (!model && !action) return null;
    return [model, action].filter(Boolean).join(".");
  } catch {
    return null;
  }
}

/** El secreto vive solo en el servidor y jamás se devuelve a la UI. */
function webhookSecret(): string | undefined {
  const raw = process.env.TOGGL_WEBHOOK_SECRET?.trim();
  return raw ? raw : undefined;
}

export function webhookCallbackUrl(): string | null {
  const base = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}/api/webhooks/toggl`;
}

export function describeWebhookError(err: unknown): string {
  if (err instanceof TogglWebhookError) return err.message;
  if (err instanceof Error && err.message === "NO_WORKSPACE") {
    return "Elige primero un workspace de Toggl.";
  }
  return "No se ha podido gestionar el webhook de Toggl.";
}

/** Estado para pintar en Integraciones. Nunca expone el secreto. */
export async function getWebhookStatus(): Promise<WebhookStatusView> {
  const s = await getTogglSettings();
  return {
    status: s.webhookStatus,
    subscriptionId: s.webhookSubscriptionId,
    callbackUrl: s.webhookCallbackUrl,
    expectedCallbackUrl: webhookCallbackUrl(),
    validatedAt: s.webhookValidatedAt,
    lastEventAt: s.webhookLastEventAt,
    lastSuccessAt: s.webhookLastError ? null : s.webhookLastEventAt,
    lastEventType: lastEventTypeFrom(s.webhookLastEnvelope),
    lastError: s.webhookLastError,
    secretConfigured: !!webhookSecret(),
    appUrlConfigured: !!webhookCallbackUrl(),
    eventFilters: CONFIGURED_EVENT_FILTERS,
  };
}

function statusFromSubscription(sub: TogglSubscription): TogglWebhookStatus {
  if (sub.deleted_at) return "not_configured";
  if (!sub.enabled) return "error";
  return sub.validated_at ? "active" : "pending_validation";
}

async function requireWorkspace(): Promise<number> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");
  return settings.workspaceId;
}

/**
 * Crea la suscripción, o reutiliza la que ya exista con nuestra descripción.
 *
 * Reutilizar es intencionado: la descripción es única y estable justamente para
 * no acabar con una suscripción nueva por cada clic.
 */
export async function configureWebhook(actorId: string): Promise<WebhookStatusView> {
  const secret = webhookSecret();
  if (!secret) throw new TogglWebhookError("UNKNOWN", "Falta TOGGL_WEBHOOK_SECRET en el servidor.");
  const callback = webhookCallbackUrl();
  if (!callback) {
    throw new TogglWebhookError("UNKNOWN", "Falta APP_URL: sin ella Toggl no sabe a dónde llamar.");
  }

  const workspaceId = await requireWorkspace();
  const client = new TogglWebhookClient();

  const existing = (await client.listSubscriptions(workspaceId)).filter(
    (s) => !s.deleted_at && s.description === TOGGL_SUBSCRIPTION_DESCRIPTION,
  );

  // Si ya hay una apuntando a la URL correcta, no se crea otra.
  const reusable = existing.find((s) => s.url_callback === callback);
  let subscription: TogglSubscription;

  if (reusable) {
    subscription = reusable;
  } else {
    // Suscripciones nuestras que apuntan a otra URL (cambió APP_URL): se
    // eliminan para no recibir eventos por duplicado.
    for (const stale of existing) {
      try {
        await client.deleteSubscription(workspaceId, stale.subscription_id);
      } catch {
        // Si no se puede borrar, seguimos: peor es no tener webhook.
      }
    }
    subscription = await client.createSubscription(workspaceId, {
      urlCallback: callback,
      secret,
      description: TOGGL_SUBSCRIPTION_DESCRIPTION,
    });
  }

  await patchTogglSettings({
    webhookSubscriptionId: subscription.subscription_id,
    webhookCallbackUrl: callback,
    webhookStatus: statusFromSubscription(subscription),
    webhookValidatedAt: subscription.validated_at ?? null,
    webhookLastError: null,
  });

  await audit({
    actorId,
    action: "update",
    entityType: "TogglWebhook",
    entityId: String(subscription.subscription_id),
    metadata: { reused: !!reusable, callback },
  });

  return getWebhookStatus();
}

/** Relee el estado real desde Toggl (¿validada?, ¿activa?). */
export async function refreshWebhookStatus(): Promise<WebhookStatusView> {
  const settings = await getTogglSettings();
  if (!settings.webhookSubscriptionId) return getWebhookStatus();

  const workspaceId = await requireWorkspace();
  const client = new TogglWebhookClient();
  const subs = await client.listSubscriptions(workspaceId);
  const mine = subs.find((s) => s.subscription_id === settings.webhookSubscriptionId);

  if (!mine || mine.deleted_at) {
    await patchTogglSettings({
      webhookStatus: "not_configured",
      webhookSubscriptionId: null,
      webhookValidatedAt: null,
      webhookLastError: "La suscripción ya no existe en Toggl.",
    });
    return getWebhookStatus();
  }

  await patchTogglSettings({
    webhookStatus: statusFromSubscription(mine),
    webhookValidatedAt: mine.validated_at ?? null,
    webhookCallbackUrl: mine.url_callback ?? settings.webhookCallbackUrl,
    webhookLastError: mine.enabled ? null : "Toggl ha desactivado la suscripción.",
  });
  return getWebhookStatus();
}

/** Pide a Toggl que reenvíe el ping de validación. */
export async function pingWebhook(actorId: string): Promise<WebhookStatusView> {
  const settings = await getTogglSettings();
  if (!settings.webhookSubscriptionId) {
    throw new TogglWebhookError("NOT_FOUND", "No hay ninguna suscripción configurada.");
  }
  const workspaceId = await requireWorkspace();
  await new TogglWebhookClient().pingSubscription(workspaceId, settings.webhookSubscriptionId);
  await audit({
    actorId,
    action: "update",
    entityType: "TogglWebhook",
    entityId: String(settings.webhookSubscriptionId),
    metadata: { ping: true },
  });
  return refreshWebhookStatus();
}

/** Elimina la suscripción en Toggl y limpia el estado local. */
export async function removeWebhook(actorId: string): Promise<WebhookStatusView> {
  const settings = await getTogglSettings();
  if (settings.webhookSubscriptionId) {
    const workspaceId = await requireWorkspace();
    try {
      await new TogglWebhookClient().deleteSubscription(
        workspaceId,
        settings.webhookSubscriptionId,
      );
    } catch (err) {
      // Si Toggl dice que ya no existe, el objetivo está cumplido.
      if (!(err instanceof TogglWebhookError && err.code === "NOT_FOUND")) throw err;
    }
    await audit({
      actorId,
      action: "delete",
      entityType: "TogglWebhook",
      entityId: String(settings.webhookSubscriptionId),
    });
  }

  await patchTogglSettings({
    webhookStatus: "not_configured",
    webhookSubscriptionId: null,
    webhookValidatedAt: null,
    webhookCallbackUrl: null,
    webhookLastError: null,
  });
  return getWebhookStatus();
}

// ---------------------------------------------------------------------------
// Estado que actualiza la ruta pública al recibir entregas
// ---------------------------------------------------------------------------

export async function recordWebhookValidated(): Promise<void> {
  await patchTogglSettings({
    webhookStatus: "active",
    webhookValidatedAt: new Date().toISOString(),
    webhookLastError: null,
  });
}

export async function recordWebhookDelivery(envelope: unknown, error?: string): Promise<void> {
  let snapshot: string | null = null;
  try {
    // Recortado: solo interesa ver la forma, no acumular datos.
    snapshot = JSON.stringify(envelope).slice(0, 2000);
  } catch {
    snapshot = null;
  }
  await patchTogglSettings({
    webhookLastEventAt: new Date().toISOString(),
    webhookLastEnvelope: snapshot,
    webhookLastError: error ?? null,
    ...(error ? {} : { webhookStatus: "active" as const }),
  });
}

/** Se usa para no dejar la integración muda si el proceso falla. */
export async function recordWebhookError(message: string): Promise<void> {
  await patchTogglSettings({
    webhookLastError: message.slice(0, 500),
    webhookLastEventAt: new Date().toISOString(),
  });
}

/** Usuaria a la que se atribuyen las entradas que llegan de Toggl. */
export async function resolveWebhookActorId(): Promise<string | null> {
  const owner = await prisma.user.findFirst({
    where: { role: "owner" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (owner) return owner.id;
  const anyUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return anyUser?.id ?? null;
}
