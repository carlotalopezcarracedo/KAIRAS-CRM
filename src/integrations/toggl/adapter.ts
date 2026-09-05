import { z } from "zod";

/**
 * Toggl Track API v9 — cliente server-side.
 *
 * El token vive solo en `process.env.TOGGL_API_TOKEN` y nunca sale de este
 * módulo: no se serializa en ninguna respuesta, no se registra en logs y no
 * aparece en mensajes de error (los códigos de error son fijos, no incluyen
 * el body de la petición ni cabeceras).
 *
 * Mismo patrón que `src/integrations/odoo/adapter.ts`: config vía env,
 * cliente HTTP con timeout explícito, clase de error tipada por código,
 * validación runtime con Zod de todo lo que llega de fuera.
 */

const TOGGL_BASE_URL = "https://api.track.toggl.com/api/v9";
const REQUEST_TIMEOUT_MS = 12_000;

/** Identificador que Toggl exige en toda TimeEntry creada por la API. */
export const TOGGL_CREATED_WITH = "Kairas CRM";

export type TogglErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  // Límite de histórico de la cuenta/plan (p.ej. "start_date must not be
  // earlier than X"): a diferencia de RATE_LIMITED, reintentar esta MISMA
  // ventana nunca tendrá éxito -- el límite es una fecha móvil que solo se
  // aleja con el tiempo, nunca se acerca.
  | "RANGE_TOO_OLD"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "UNAVAILABLE";

export class TogglApiError extends Error {
  constructor(
    readonly code: TogglErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TogglApiError";
  }
}

export type TogglConfig = { configured: boolean };

export function getTogglConfig(): TogglConfig {
  return { configured: !!process.env.TOGGL_API_TOKEN?.trim() };
}

// ---------------------------------------------------------------------------
// Esquemas de validación (lo mínimo que Kairas consume de cada recurso)
// ---------------------------------------------------------------------------

const meSchema = z.object({
  id: z.number(),
  email: z.string().nullable().optional(),
  fullname: z.string().nullable().optional(),
  default_workspace_id: z.number().nullable().optional(),
});

const workspaceSchema = z.object({
  id: z.number(),
  name: z.string(),
});
const workspaceListSchema = z.array(workspaceSchema);

const projectSchema = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name: z.string(),
  active: z.boolean().optional(),
});
const projectListSchema = z.array(projectSchema);

const timeEntryRawSchema = z.object({
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
  // Solo presente en peticiones con `since=`: marca una entrada eliminada
  // en Toggl. Ausente/null en el resto de endpoints.
  server_deleted_at: z.string().nullable().optional(),
});
const timeEntryListSchema = z.array(timeEntryRawSchema);
// GET /me/time_entries/current devuelve literalmente `null` sin cronómetro activo.
const currentTimeEntrySchema = timeEntryRawSchema.nullable();

export type TogglMe = {
  id: number;
  email: string | null;
  fullname: string | null;
  defaultWorkspaceId: number | null;
};

export type TogglWorkspace = { id: number; name: string };

export type TogglProject = {
  id: number;
  workspaceId: number;
  name: string;
  active: boolean;
};

export type TogglTimeEntry = {
  id: number;
  workspaceId: number;
  projectId: number | null;
  description: string | null;
  start: string; // RFC3339
  stop: string | null; // RFC3339, null = en curso
  durationSeconds: number; // negativo mientras está en curso (convención Toggl)
  billable: boolean;
  tags: string[];
  updatedAt: string; // RFC3339, campo "at" de Toggl
  deletedAt: string | null; // "server_deleted_at", solo relevante con since=
  running: boolean;
};

function mapTimeEntry(raw: z.infer<typeof timeEntryRawSchema>): TogglTimeEntry {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    projectId: raw.project_id ?? null,
    description: raw.description ?? null,
    start: raw.start,
    stop: raw.stop ?? null,
    durationSeconds: raw.duration,
    billable: raw.billable ?? false,
    tags: raw.tags ?? [],
    updatedAt: raw.at,
    deletedAt: raw.server_deleted_at ?? null,
    running: !raw.stop,
  };
}

export type CreateTimeEntryInput = {
  description?: string | null;
  start: string; // RFC3339
  stop?: string | null;
  durationSeconds: number; // -1 si el cronómetro sigue en curso, por convención Toggl
  projectId?: number | null;
  billable?: boolean;
  tags?: string[];
};

export type UpdateTimeEntryInput = Partial<CreateTimeEntryInput>;

/** Detecta el mensaje textual de límite de histórico ("start_date must not be earlier than ..."). */
const RANGE_TOO_OLD_PATTERN = /start_date must not be earlier than/i;

function sanitizeBody(body: string | undefined): string {
  return (body ?? "").trim().replace(/^"|"$/g, "");
}

/** Errores por código de estado. Nunca incluye el token ni cabeceras. */
function errorForStatus(status: number, body?: string): TogglApiError {
  if (status === 401) {
    return new TogglApiError(
      "UNAUTHORIZED",
      "Toggl ha rechazado el token. Revísalo o genera uno nuevo en tu perfil de Toggl.",
    );
  }
  if (status === 403) {
    return new TogglApiError(
      "FORBIDDEN",
      "El token no tiene permiso sobre este recurso de Toggl.",
    );
  }
  if (status === 404) {
    return new TogglApiError("NOT_FOUND", "Toggl no ha encontrado el recurso solicitado.");
  }
  // 400 con este mensaje concreto no es una petición mal formada: es la cuenta
  // de Toggl rechazando un `start_date` más allá de lo que su plan permite
  // consultar por este endpoint. Es un límite de fecha móvil (~ahora - X días),
  // así que reintentar la MISMA ventana nunca lo resuelve.
  if (status === 400 && RANGE_TOO_OLD_PATTERN.test(body ?? "")) {
    return new TogglApiError("RANGE_TOO_OLD", sanitizeBody(body));
  }
  // 402 (cuota de la cuenta agotada, visto en algunos planes) se trata igual
  // que 429: es un problema de cuota, no del dato pedido.
  if (status === 429 || status === 402) {
    return new TogglApiError(
      "RATE_LIMITED",
      "Toggl ha limitado las peticiones (cuota agotada). Se puede reintentar más tarde.",
    );
  }
  if (status >= 500) {
    return new TogglApiError(
      "UNAVAILABLE",
      `Toggl no está disponible en este momento (HTTP ${status}).`,
    );
  }
  return new TogglApiError(
    "UNAVAILABLE",
    `Toggl ha devuelto un error inesperado (HTTP ${status}).`,
  );
}

export type TogglQuota = { remaining: number; resetsInSeconds: number; observedAt: Date };

/**
 * Última cuota observada en una respuesta real de Toggl. En memoria del
 * proceso, nunca en BD (no hace falta persistirla) -- se actualiza sola con
 * cada petición ya hecha por otro motivo, sin llamadas adicionales solo para
 * consultarla.
 */
let lastQuota: TogglQuota | null = null;

export function getLastTogglQuota(): TogglQuota | null {
  return lastQuota;
}

/** Umbral a partir del cual una operación masiva (import, reintentos) debe pararse. */
export const LOW_TOGGL_QUOTA_THRESHOLD = 3;

export function isTogglQuotaLow(): boolean {
  return lastQuota !== null && lastQuota.remaining <= LOW_TOGGL_QUOTA_THRESHOLD;
}

/**
 * Exportada para que `reports-adapter.ts` (mismo token, misma cuota de
 * cuenta) alimente el mismo singleton en memoria -- `isTogglQuotaLow()` debe
 * reflejar el uso combinado de Track API y Reports API, no solo uno de los dos.
 */
export function captureQuota(headers: Headers): void {
  const remaining = headers.get("x-toggl-quota-remaining");
  const resetsIn = headers.get("x-toggl-quota-resets-in");
  if (remaining === null || resetsIn === null) return;
  const remainingNum = Number(remaining);
  const resetsInNum = Number(resetsIn);
  if (!Number.isFinite(remainingNum) || !Number.isFinite(resetsInNum)) return;
  lastQuota = { remaining: remainingNum, resetsInSeconds: resetsInNum, observedAt: new Date() };
}

export class TogglClient {
  private readonly token: string | null;

  constructor() {
    this.token = process.env.TOGGL_API_TOKEN?.trim() || null;
  }

  private authHeader(): string {
    // Basic Auth: username = token, password = "api_token" (convención Toggl v9).
    return `Basic ${Buffer.from(`${this.token}:api_token`, "utf8").toString("base64")}`;
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    if (!this.token) {
      throw new TogglApiError(
        "NOT_CONFIGURED",
        "Toggl no tiene token configurado (TOGGL_API_TOKEN).",
      );
    }

    let response: Response;
    try {
      response = await fetch(`${TOGGL_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json; charset=utf-8",
          ...(init.headers ?? {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new TogglApiError("TIMEOUT", "Toggl ha tardado demasiado en responder.");
      }
      throw new TogglApiError("UNAVAILABLE", "No se ha podido conectar con Toggl.");
    }

    // Se lee tanto si la respuesta es 2xx como si no: Toggl manda estas
    // cabeceras siempre, incluido un 429.
    captureQuota(response.headers);

    const text = await response.text();
    if (!response.ok) throw errorForStatus(response.status, text);

    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new TogglApiError(
          "INVALID_RESPONSE",
          "Toggl ha devuelto una respuesta que Kairas no puede leer.",
        );
      }
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new TogglApiError(
        "INVALID_RESPONSE",
        "La estructura de datos recibida de Toggl no es válida.",
      );
    }
    return parsed.data;
  }

  async getMe(): Promise<TogglMe> {
    const raw = await this.request("/me", meSchema);
    return {
      id: raw.id,
      email: raw.email ?? null,
      fullname: raw.fullname ?? null,
      defaultWorkspaceId: raw.default_workspace_id ?? null,
    };
  }

  async getWorkspaces(): Promise<TogglWorkspace[]> {
    return this.request("/me/workspaces", workspaceListSchema);
  }

  async getProjects(workspaceId: number): Promise<TogglProject[]> {
    const raw = await this.request(
      `/workspaces/${workspaceId}/projects?active=both&per_page=500`,
      projectListSchema,
    );
    return raw.map((p) => ({
      id: p.id,
      workspaceId: p.workspace_id,
      name: p.name,
      active: p.active ?? true,
    }));
  }

  /**
   * Entradas del rango dado. `startDate`/`endDate` en formato YYYY-MM-DD
   * (importación histórica); `since` como cursor Unix — incluye borradas
   * (`server_deleted_at`), usado en la reconciliación.
   */
  async getTimeEntries(params: {
    startDate?: string;
    endDate?: string;
    since?: number;
  }): Promise<TogglTimeEntry[]> {
    const search = new URLSearchParams();
    if (params.startDate) search.set("start_date", params.startDate);
    if (params.endDate) search.set("end_date", params.endDate);
    if (params.since !== undefined) search.set("since", String(params.since));
    search.set("meta", "false");

    const raw = await this.request(
      `/me/time_entries?${search.toString()}`,
      timeEntryListSchema,
    );
    return raw.map(mapTimeEntry);
  }

  async getCurrentTimeEntry(): Promise<TogglTimeEntry | null> {
    const raw = await this.request("/me/time_entries/current", currentTimeEntrySchema);
    return raw ? mapTimeEntry(raw) : null;
  }

  async getTimeEntry(id: number): Promise<TogglTimeEntry> {
    const raw = await this.request(`/me/time_entries/${id}`, timeEntryRawSchema);
    return mapTimeEntry(raw);
  }

  // -------------------------------------------------------------------------
  // Escritura Kairas -> Toggl. Preparado y probado, pero no invocado todavía
  // desde ningún flujo: el push completo llega en la fase siguiente.
  // -------------------------------------------------------------------------

  async createTimeEntry(
    workspaceId: number,
    input: CreateTimeEntryInput,
  ): Promise<TogglTimeEntry> {
    const raw = await this.request(`/workspaces/${workspaceId}/time_entries`, timeEntryRawSchema, {
      method: "POST",
      body: JSON.stringify({
        created_with: TOGGL_CREATED_WITH,
        workspace_id: workspaceId,
        description: input.description ?? "",
        start: input.start,
        stop: input.stop ?? undefined,
        duration: input.durationSeconds,
        project_id: input.projectId ?? null,
        billable: input.billable ?? false,
        tags: input.tags ?? [],
      }),
    });
    return mapTimeEntry(raw);
  }

  async updateTimeEntry(
    workspaceId: number,
    id: number,
    input: UpdateTimeEntryInput,
  ): Promise<TogglTimeEntry> {
    const body: Record<string, unknown> = {};
    if (input.description !== undefined) body.description = input.description ?? "";
    if (input.start !== undefined) body.start = input.start;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.durationSeconds !== undefined) body.duration = input.durationSeconds;
    if (input.projectId !== undefined) body.project_id = input.projectId;
    if (input.billable !== undefined) body.billable = input.billable;
    if (input.tags !== undefined) body.tags = input.tags;

    const raw = await this.request(
      `/workspaces/${workspaceId}/time_entries/${id}`,
      timeEntryRawSchema,
      { method: "PUT", body: JSON.stringify(body) },
    );
    return mapTimeEntry(raw);
  }

  async stopTimeEntry(workspaceId: number, id: number): Promise<TogglTimeEntry> {
    const raw = await this.request(
      `/workspaces/${workspaceId}/time_entries/${id}/stop`,
      timeEntryRawSchema,
      { method: "PATCH" },
    );
    return mapTimeEntry(raw);
  }

  async deleteTimeEntry(workspaceId: number, id: number): Promise<void> {
    await this.request(`/workspaces/${workspaceId}/time_entries/${id}`, z.unknown(), {
      method: "DELETE",
    });
  }
}
