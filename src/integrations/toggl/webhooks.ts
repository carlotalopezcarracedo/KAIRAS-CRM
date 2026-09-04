/**
 * Webhooks de Toggl Track: firma, sobre de evento y API de suscripciones.
 *
 * Base de la API de webhooks (distinta de la API v9 de datos):
 *   https://api.track.toggl.com/webhooks/api/v1
 *
 * NOTA SOBRE EL CONTRATO
 * La documentación de webhooks de Toggl vive en un sitio que no se ha podido
 * consultar automáticamente al escribir esto. Por eso el parseo del sobre es
 * DELIBERADAMENTE TOLERANTE: solo se exige lo imprescindible (la entrada en
 * `payload` y una acción reconocible) y se aceptan las dos formas habituales de
 * expresar la acción (`metadata.action` y `event_type`). El cuerpo íntegro del
 * último evento se guarda en Integraciones para poder ver la forma real en
 * cuanto llegue el primero. Hasta entonces esto es NEEDS REAL TOGGL VERIFICATION.
 */
import crypto from "node:crypto";
import { z } from "zod";

export const TOGGL_WEBHOOKS_BASE_URL = "https://api.track.toggl.com/webhooks/api/v1";

/** Cabecera con la que Toggl firma cada entrega. */
export const TOGGL_SIGNATURE_HEADER = "x-webhook-signature-256";

/** Descripción única y estable: evita crear suscripciones duplicadas. */
export const TOGGL_SUBSCRIPTION_DESCRIPTION = "Kairas CRM Time Sync";

// ---------------------------------------------------------------------------
// Firma
// ---------------------------------------------------------------------------

export type SignatureCheck =
  | { valid: true }
  | { valid: false; reason: "missing_secret" | "missing_header" | "bad_format" | "mismatch" };

/**
 * Verifica la firma HMAC-SHA256 de una entrega.
 *
 * CRÍTICO: `rawBody` debe ser el cuerpo EXACTO que llegó por la red. Volver a
 * serializar el objeto ya parseado (JSON.stringify) cambia espacios y orden de
 * claves y la firma dejaría de cuadrar.
 */
export function verifyTogglSignature(
  rawBody: string,
  headerValue: string | null | undefined,
  secret: string | undefined,
): SignatureCheck {
  if (!secret) return { valid: false, reason: "missing_secret" };
  if (!headerValue) return { valid: false, reason: "missing_header" };

  // Formato documentado: "sha256=<hex>". Se acepta también el hex pelado por
  // tolerancia, pero nada más.
  const match = /^(?:sha256=)?([0-9a-f]{64})$/i.exec(headerValue.trim());
  if (!match) return { valid: false, reason: "bad_format" };

  const received = Buffer.from(match[1].toLowerCase(), "hex");
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest();

  // Longitudes iguales por construcción (32 bytes), pero timingSafeEqual lanza
  // si difieren, así que se comprueba igualmente.
  if (received.length !== expected.length) return { valid: false, reason: "mismatch" };
  if (!crypto.timingSafeEqual(received, expected)) return { valid: false, reason: "mismatch" };
  return { valid: true };
}

/** Firma de prueba: solo se usa en tests para construir entregas válidas. */
export function signTogglPayload(rawBody: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Sobre del evento
// ---------------------------------------------------------------------------

/**
 * Entrada de tiempo tal y como viaja dentro del webhook. Es el mismo modelo que
 * devuelve la API v9, así que se validan los mismos campos que ya usa el
 * adapter. Todo lo accesorio se ignora.
 */
const webhookTimeEntrySchema = z.object({
  id: z.number(),
  workspace_id: z.number(),
  project_id: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  start: z.string(),
  stop: z.string().nullable().optional(),
  duration: z.number(),
  tags: z.array(z.string()).nullable().optional(),
  billable: z.boolean().nullable().optional(),
  at: z.string(),
  server_deleted_at: z.string().nullable().optional(),
});

const envelopeSchema = z.object({
  event_id: z.union([z.number(), z.string()]).optional(),
  subscription_id: z.union([z.number(), z.string()]).optional(),
  creator_id: z.union([z.number(), z.string()]).optional(),
  timestamp: z.string().optional(),
  created_at: z.string().optional(),
  event_type: z.string().optional(),
  metadata: z
    .object({
      action: z.string().optional(),
      model: z.string().optional(),
      workspace_id: z.union([z.number(), z.string()]).optional(),
      time_entry_id: z.union([z.number(), z.string()]).optional(),
    })
    .passthrough()
    .optional(),
  payload: z.unknown().optional(),
  // Validación de la suscripción
  validation_code: z.string().optional(),
  validation_code_url: z.string().optional(),
});

export type TogglWebhookAction = "created" | "updated" | "deleted";

export type ParsedWebhook =
  | { kind: "validation"; validationCode: string; validationCodeUrl: string | null }
  | { kind: "ping" }
  | {
      kind: "time_entry";
      action: TogglWebhookAction;
      entry: z.infer<typeof webhookTimeEntrySchema>;
      eventId: string | null;
      timestamp: string | null;
    }
  | { kind: "ignored"; reason: string };

/** Extrae la acción tolerando `metadata.action` y `event_type`. */
function readAction(env: z.infer<typeof envelopeSchema>): TogglWebhookAction | null {
  const raw = (env.metadata?.action ?? env.event_type ?? "").toLowerCase();
  if (!raw) return null;
  if (raw.includes("delet")) return "deleted";
  if (raw.includes("updat")) return "updated";
  if (raw.includes("creat")) return "created";
  return null;
}

/** Modelo afectado; si no viene, se asume que es el que hemos filtrado. */
function readModel(env: z.infer<typeof envelopeSchema>): string {
  const fromMeta = env.metadata?.model;
  if (fromMeta) return String(fromMeta).toLowerCase();
  const fromType = env.event_type ?? "";
  return fromType.split(".")[0]?.toLowerCase() || "time_entry";
}

export function parseTogglWebhook(body: unknown): ParsedWebhook {
  const env = envelopeSchema.safeParse(body);
  if (!env.success) return { kind: "ignored", reason: "sobre no reconocible" };
  const data = env.data;

  // 1. Alta de la suscripción: Toggl manda un código que hay que devolver.
  if (data.validation_code) {
    return {
      kind: "validation",
      validationCode: data.validation_code,
      validationCodeUrl: data.validation_code_url ?? null,
    };
  }

  // 2. Ping de comprobación.
  if (typeof data.payload === "string") {
    return data.payload.toLowerCase() === "ping"
      ? { kind: "ping" }
      : { kind: "ignored", reason: "payload de texto no reconocido" };
  }

  const model = readModel(data);
  if (model !== "time_entry") {
    return { kind: "ignored", reason: `modelo no gestionado: ${model}` };
  }

  const action = readAction(data);
  if (!action) return { kind: "ignored", reason: "acción no reconocida" };

  const entry = webhookTimeEntrySchema.safeParse(data.payload);
  if (!entry.success) {
    return { kind: "ignored", reason: "payload sin una entrada de tiempo válida" };
  }

  return {
    kind: "time_entry",
    action,
    entry: entry.data,
    eventId: data.event_id != null ? String(data.event_id) : null,
    timestamp: data.timestamp ?? data.created_at ?? null,
  };
}

/**
 * Convierte la entrada del webhook al mismo tipo que produce el adapter, para
 * poder reutilizar `applyRemoteEntry` sin duplicar lógica de mapeo.
 *
 * `deleted` no siempre viaja con `server_deleted_at`, así que la acción manda:
 * si Toggl dice que se ha borrado, se marca como borrada.
 */
export function webhookEntryToTogglTimeEntry(
  entry: z.infer<typeof webhookTimeEntrySchema>,
  action: TogglWebhookAction,
) {
  return {
    id: entry.id,
    workspaceId: entry.workspace_id,
    projectId: entry.project_id ?? null,
    description: entry.description ?? null,
    start: entry.start,
    stop: entry.stop ?? null,
    durationSeconds: entry.duration,
    running: entry.duration < 0,
    billable: entry.billable ?? false,
    tags: entry.tags ?? [],
    updatedAt: entry.at,
    deletedAt: action === "deleted" ? (entry.server_deleted_at ?? entry.at) : null,
  };
}

// ---------------------------------------------------------------------------
// API de suscripciones
// ---------------------------------------------------------------------------

const subscriptionSchema = z.object({
  subscription_id: z.number(),
  workspace_id: z.number().optional(),
  user_id: z.number().optional(),
  url_callback: z.string().optional(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  secret: z.string().nullable().optional(),
  validated_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  has_pending_events: z.boolean().nullable().optional(),
  event_filters: z
    .array(z.object({ entity: z.string(), action: z.string() }))
    .nullable()
    .optional(),
});
export type TogglSubscription = z.infer<typeof subscriptionSchema>;

const subscriptionListSchema = z.union([
  z.array(subscriptionSchema),
  z.object({ subscriptions: z.array(subscriptionSchema).nullable() }),
]);

export class TogglWebhookError extends Error {
  constructor(
    readonly code: "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMIT" | "SERVER" | "UNKNOWN",
    message: string,
  ) {
    super(message);
    this.name = "TogglWebhookError";
  }
}

function errorForStatus(status: number): TogglWebhookError {
  if (status === 401 || status === 403) {
    return new TogglWebhookError(
      "UNAUTHORIZED",
      "Toggl ha rechazado el token al gestionar los webhooks.",
    );
  }
  if (status === 404) {
    return new TogglWebhookError("NOT_FOUND", "La suscripción de webhook no existe en Toggl.");
  }
  if (status === 429) {
    return new TogglWebhookError("RATE_LIMIT", "Toggl ha limitado las peticiones. Prueba en un minuto.");
  }
  if (status >= 500) {
    return new TogglWebhookError("SERVER", "Toggl está devolviendo errores. Inténtalo más tarde.");
  }
  return new TogglWebhookError("UNKNOWN", `Toggl ha respondido con un error (${status}).`);
}

const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Cliente de la API de webhooks. Usa el mismo token que el resto de la
 * integración; nunca lo devuelve ni lo incluye en los errores.
 */
export class TogglWebhookClient {
  private readonly token: string;

  constructor() {
    const token = process.env.TOGGL_API_TOKEN?.trim();
    if (!token) throw new TogglWebhookError("UNAUTHORIZED", "Falta TOGGL_API_TOKEN.");
    this.token = token;
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.token}:api_token`).toString("base64");
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: { method?: string; body?: string },
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${TOGGL_WEBHOOKS_BASE_URL}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        body: init?.body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new TogglWebhookError("UNKNOWN", "No se ha podido contactar con Toggl.");
    }

    if (!response.ok) throw errorForStatus(response.status);

    const text = await response.text();
    if (!text) return schema.parse(undefined as unknown as T);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new TogglWebhookError("UNKNOWN", "Toggl ha devuelto una respuesta ilegible.");
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new TogglWebhookError("UNKNOWN", "La respuesta de Toggl no tiene el formato esperado.");
    }
    return parsed.data;
  }

  async listSubscriptions(workspaceId: number): Promise<TogglSubscription[]> {
    const raw = await this.request(`/subscriptions/${workspaceId}`, subscriptionListSchema);
    if (Array.isArray(raw)) return raw;
    return raw.subscriptions ?? [];
  }

  async createSubscription(
    workspaceId: number,
    input: { urlCallback: string; secret: string; description?: string },
  ): Promise<TogglSubscription> {
    return this.request(`/subscriptions/${workspaceId}`, subscriptionSchema, {
      method: "POST",
      body: JSON.stringify({
        url_callback: input.urlCallback,
        secret: input.secret,
        description: input.description ?? TOGGL_SUBSCRIPTION_DESCRIPTION,
        enabled: true,
        event_filters: [
          { entity: "time_entry", action: "created" },
          { entity: "time_entry", action: "updated" },
          { entity: "time_entry", action: "deleted" },
        ],
      }),
    });
  }

  async deleteSubscription(workspaceId: number, subscriptionId: number): Promise<void> {
    await this.request(`/subscriptions/${workspaceId}/${subscriptionId}`, z.unknown(), {
      method: "DELETE",
    });
  }

  /** Pide a Toggl que vuelva a mandar el ping de validación. */
  async pingSubscription(workspaceId: number, subscriptionId: number): Promise<void> {
    await this.request(`/subscriptions/${workspaceId}/${subscriptionId}/ping`, z.unknown(), {
      method: "POST",
    });
  }
}
