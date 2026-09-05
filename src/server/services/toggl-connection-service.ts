import { audit } from "@/server/audit/audit";
import { getSetting, setSetting } from "@/server/services/settings-service";
import {
  TogglClient,
  TogglApiError,
  getTogglConfig,
  type TogglWorkspace,
} from "@/integrations/toggl/adapter";
import { TogglReportsError } from "@/integrations/toggl/reports-adapter";

/**
 * Estado de la conexión con Toggl: mismo patrón que `calendar-feed-service.ts`
 * (config singleton guardada en `Settings`, sin tabla dedicada). El token
 * sigue viviendo solo en `TOGGL_API_TOKEN`; aquí solo se guarda metadata no
 * sensible (workspace elegido, email de la cuenta, marcas de tiempo).
 */

const SETTINGS_KEY = "integrations.toggl";

export type TogglIntegrationSettings = {
  workspaceId: number | null;
  workspaceName: string | null;
  accountEmail: string | null;
  lastCheckedAt: string | null; // ISO
  lastCheckedOk: boolean | null;
  lastCheckedError: string | null;
  lastImportAt: string | null; // ISO
  /** Cursor unix (segundos) de la última reconciliación completada con éxito. */
  lastReconciledAt: number | null;

  // --- Webhook Toggl -> Kairas ---
  webhookStatus: TogglWebhookStatus;
  webhookSubscriptionId: number | null;
  webhookCallbackUrl: string | null;
  webhookValidatedAt: string | null; // ISO
  webhookLastEventAt: string | null; // ISO
  webhookLastError: string | null;
  /**
   * Último sobre recibido, recortado. Sirve para ver la forma REAL de los
   * eventos de Toggl (la documentación no es consultable) sin tener que mirar
   * los logs del servidor. Nunca contiene la firma ni el secreto.
   */
  webhookLastEnvelope: string | null;
};

export type TogglWebhookStatus =
  | "not_configured"
  | "pending_validation"
  | "active"
  | "error";

const DEFAULTS: TogglIntegrationSettings = {
  workspaceId: null,
  workspaceName: null,
  accountEmail: null,
  lastCheckedAt: null,
  lastCheckedOk: null,
  lastCheckedError: null,
  lastImportAt: null,
  lastReconciledAt: null,
  webhookStatus: "not_configured",
  webhookSubscriptionId: null,
  webhookCallbackUrl: null,
  webhookValidatedAt: null,
  webhookLastEventAt: null,
  webhookLastError: null,
  webhookLastEnvelope: null,
};

export async function getTogglSettings(): Promise<TogglIntegrationSettings> {
  const stored = await getSetting<Partial<TogglIntegrationSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULTS, ...stored };
}

export async function patchTogglSettings(
  patch: Partial<TogglIntegrationSettings>,
): Promise<TogglIntegrationSettings> {
  const current = await getTogglSettings();
  const next = { ...current, ...patch };
  await setSetting(SETTINGS_KEY, next);
  return next;
}

export function describeTogglError(error: unknown): string {
  if (error instanceof TogglApiError) return error.message;
  if (error instanceof TogglReportsError) return error.message;
  return "No se ha podido conectar con Toggl.";
}

export type ConnectionCheckResult =
  | {
      ok: true;
      account: { email: string | null; fullname: string | null };
      workspaces: TogglWorkspace[];
      selectedWorkspaceId: number | null;
    }
  | { ok: false; error: string };

/**
 * Comprueba la conexión (`/me` + `/me/workspaces`). Con exactamente un
 * workspace disponible se selecciona automáticamente; con varios, se deja
 * para elección manual salvo que ya hubiera uno guardado y siga existiendo.
 */
export async function checkTogglConnection(actorId: string): Promise<ConnectionCheckResult> {
  const config = getTogglConfig();
  if (!config.configured) {
    await patchTogglSettings({
      lastCheckedAt: new Date().toISOString(),
      lastCheckedOk: false,
      lastCheckedError: "Falta configurar TOGGL_API_TOKEN en el servidor.",
    });
    return { ok: false, error: "Falta configurar TOGGL_API_TOKEN en el servidor." };
  }

  const client = new TogglClient();
  try {
    const [me, workspaces] = await Promise.all([client.getMe(), client.getWorkspaces()]);

    const current = await getTogglSettings();
    let workspaceId = current.workspaceId;
    let workspaceName = current.workspaceName;

    if (workspaceId && !workspaces.some((w) => w.id === workspaceId)) {
      workspaceId = null;
      workspaceName = null;
    }
    if (!workspaceId && workspaces.length === 1) {
      workspaceId = workspaces[0]!.id;
      workspaceName = workspaces[0]!.name;
    }

    await patchTogglSettings({
      accountEmail: me.email,
      workspaceId,
      workspaceName,
      lastCheckedAt: new Date().toISOString(),
      lastCheckedOk: true,
      lastCheckedError: null,
    });

    await audit({
      actorId,
      action: "sync",
      entityType: "TogglIntegration",
      metadata: { checkedConnection: true, workspaces: workspaces.length },
    });

    return {
      ok: true,
      account: { email: me.email, fullname: me.fullname },
      workspaces,
      selectedWorkspaceId: workspaceId,
    };
  } catch (err) {
    const message = describeTogglError(err);
    await patchTogglSettings({
      lastCheckedAt: new Date().toISOString(),
      lastCheckedOk: false,
      lastCheckedError: message,
    });
    return { ok: false, error: message };
  }
}

export async function selectTogglWorkspace(
  actorId: string,
  workspaceId: number,
  workspaceName: string,
): Promise<void> {
  await patchTogglSettings({ workspaceId, workspaceName });
  await audit({
    actorId,
    action: "update",
    entityType: "TogglIntegration",
    metadata: { workspaceSelected: workspaceId, workspaceName },
  });
}
