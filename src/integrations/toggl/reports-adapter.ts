import { z } from "zod";
import { captureQuota, type TogglTimeEntry } from "@/integrations/toggl/adapter";

/**
 * Toggl Reports API v3 (Detailed Reports) — cliente server-side, separado a
 * propósito de `adapter.ts` (API v9 "Track"): comparten cuenta y token, pero
 * son APIs distintas con formas de respuesta y paginación distintas.
 *
 * SOLO se usa para el bootstrap del import histórico (ver
 * `toggl-sync-service.ts`). Nunca para reconciliación incremental, webhooks,
 * ni cronómetro: esas vías siguen en Track API v9 (`?since=` + eventos en
 * tiempo real), que sí necesitan detectar borrados y entradas en curso, cosa
 * que Reports API no expone.
 *
 * Por qué existe: Track API v9 (`GET /me/time_entries?start_date&end_date`)
 * rechaza con HTTP 400 ("start_date must not be earlier than X") cualquier
 * fecha anterior a un límite de la cuenta/plan que avanza con el tiempo.
 * Reports API v3 no ha mostrado ese límite en las pruebas reales hechas
 * contra esta cuenta (ver auditoría 2026-09-05): acepta rangos tanto
 * recientes como muy antiguos. Por eso el import histórico usa esta fuente
 * para TODO el rango pedido, de manera uniforme -- así no hace falta partir
 * ninguna ventana en un "tramo viejo" y un "tramo reciente": no hay frontera
 * que cruzar.
 */

export const TOGGL_REPORTS_BASE_URL = "https://api.track.toggl.com/reports/api/v3";
const REQUEST_TIMEOUT_MS = 20_000;
/** Límite defensivo de páginas por ventana: nunca un bucle infinito si la API deja de parar de paginar. */
const MAX_REPORT_PAGES = 500;

export type TogglReportsErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "UNAVAILABLE";

export class TogglReportsError extends Error {
  constructor(
    readonly code: TogglReportsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TogglReportsError";
  }
}

function errorForStatus(status: number): TogglReportsError {
  if (status === 401) {
    return new TogglReportsError(
      "UNAUTHORIZED",
      "Toggl ha rechazado el token en el Reports API.",
    );
  }
  if (status === 403) {
    return new TogglReportsError(
      "FORBIDDEN",
      "El plan de Toggl no permite usar el Reports API para este workspace.",
    );
  }
  if (status === 404) {
    return new TogglReportsError("NOT_FOUND", "Toggl Reports no ha encontrado el recurso solicitado.");
  }
  if (status === 429 || status === 402) {
    return new TogglReportsError(
      "RATE_LIMITED",
      "Toggl ha limitado las peticiones al Reports API (cuota agotada). Se puede reintentar más tarde.",
    );
  }
  if (status >= 500) {
    return new TogglReportsError(
      "UNAVAILABLE",
      `Toggl Reports no está disponible en este momento (HTTP ${status}).`,
    );
  }
  return new TogglReportsError(
    "UNAVAILABLE",
    `Toggl Reports ha devuelto un error inesperado (HTTP ${status}).`,
  );
}

// ---------------------------------------------------------------------------
// Forma real de la respuesta (auditada contra la cuenta real, ver informe):
// un array de "grupos" (misma usuaria+proyecto+descripción+facturable) cada
// uno con las ocurrencias reales en `time_entries[]`. El `id` de cada
// ocurrencia es el MISMO id global que usa Track API (comprobado cruzando
// una entrada reciente entre ambas APIs).
// ---------------------------------------------------------------------------

const reportEntrySchema = z.object({
  id: z.number(),
  seconds: z.number(),
  start: z.string(),
  stop: z.string().nullable().optional(),
  at: z.string(),
});

const reportGroupSchema = z.object({
  project_id: z.number().nullable().optional(),
  billable: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
  time_entries: z.array(reportEntrySchema),
});

const reportGroupListSchema = z.array(reportGroupSchema);
type ReportGroup = z.infer<typeof reportGroupSchema>;

function flattenGroups(groups: ReportGroup[], workspaceId: number): TogglTimeEntry[] {
  const out: TogglTimeEntry[] = [];
  for (const g of groups) {
    for (const t of g.time_entries) {
      out.push({
        id: t.id,
        workspaceId,
        projectId: g.project_id ?? null,
        description: g.description || null,
        start: t.start,
        stop: t.stop ?? null,
        durationSeconds: t.seconds,
        billable: g.billable ?? false,
        // Reports API solo da `tag_ids` (números), no nombres; `applyRemoteEntry`
        // no usa `tags` todavía en ningún sentido, así que no se pierde nada.
        tags: [],
        updatedAt: t.at,
        // Reports API es un informe de entradas existentes: nunca expone
        // borrados. Detectar borrados sigue siendo tarea exclusiva de la
        // reconciliación (`since=`) y los webhooks.
        deletedAt: null,
        running: !t.stop,
      });
    }
  }
  return out;
}

type PageCursor = { id?: number; rowNumber?: number; timestamp?: number };

export class TogglReportsClient {
  private readonly token: string | null;

  constructor() {
    this.token = process.env.TOGGL_API_TOKEN?.trim() || null;
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.token}:api_token`, "utf8").toString("base64")}`;
  }

  private async requestPage(
    workspaceId: number,
    body: Record<string, unknown>,
  ): Promise<{ groups: ReportGroup[]; next: PageCursor | null }> {
    if (!this.token) {
      throw new TogglReportsError("NOT_CONFIGURED", "Toggl no tiene token configurado (TOGGL_API_TOKEN).");
    }

    let response: Response;
    try {
      response = await fetch(`${TOGGL_REPORTS_BASE_URL}/workspace/${workspaceId}/search/time_entries`, {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new TogglReportsError("TIMEOUT", "Toggl Reports ha tardado demasiado en responder.");
      }
      throw new TogglReportsError("UNAVAILABLE", "No se ha podido conectar con Toggl Reports.");
    }

    // Misma cuota de cuenta que Track API: se alimenta el mismo singleton.
    captureQuota(response.headers);

    const text = await response.text();
    if (!response.ok) throw errorForStatus(response.status);

    let json: unknown = [];
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new TogglReportsError("INVALID_RESPONSE", "Toggl Reports ha devuelto una respuesta ilegible.");
      }
    }
    const parsed = reportGroupListSchema.safeParse(json);
    if (!parsed.success) {
      throw new TogglReportsError(
        "INVALID_RESPONSE",
        "La estructura de datos recibida de Toggl Reports no es válida.",
      );
    }

    // Contrato real observado (ver informe): X-Next-ID / X-Next-Row-Number /
    // X-Next-Timestamp presentes cuando queda más por paginar; ausentes en la
    // última página. Nunca se asume una sola página.
    const nextId = response.headers.get("x-next-id");
    const nextRow = response.headers.get("x-next-row-number");
    const nextTimestamp = response.headers.get("x-next-timestamp");
    const hasNext = nextId !== null || nextRow !== null;

    return {
      groups: parsed.data,
      next: hasNext
        ? {
            id: nextId ? Number(nextId) : undefined,
            rowNumber: nextRow ? Number(nextRow) : undefined,
            timestamp: nextTimestamp ? Number(nextTimestamp) : undefined,
          }
        : null,
    };
  }

  /**
   * Descarga TODO el rango pedido, paginando de verdad hasta que Toggl deje
   * de anunciar una página siguiente (o hasta el límite de seguridad). No
   * duplica ni salta filas: cada página pide explícitamente el cursor que
   * devolvió la anterior.
   */
  async getDetailedTimeEntries(params: {
    workspaceId: number;
    startDate: string;
    endDate: string;
    pageSize?: number;
  }): Promise<TogglTimeEntry[]> {
    const pageSize = params.pageSize ?? 200;
    const out: TogglTimeEntry[] = [];
    let cursor: PageCursor | null = null;

    for (let page = 0; page < MAX_REPORT_PAGES; page++) {
      const body: Record<string, unknown> = {
        start_date: params.startDate,
        end_date: params.endDate,
        page_size: pageSize,
      };
      if (cursor?.id !== undefined) body.first_id = cursor.id;
      if (cursor?.rowNumber !== undefined) body.first_row_number = cursor.rowNumber;
      if (cursor?.timestamp !== undefined) body.first_timestamp = cursor.timestamp;

      const { groups, next } = await this.requestPage(params.workspaceId, body);
      out.push(...flattenGroups(groups, params.workspaceId));
      if (!next) break;
      cursor = next;
    }

    return out;
  }
}
