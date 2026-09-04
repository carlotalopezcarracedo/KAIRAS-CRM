/**
 * Endpoint público de webhooks de Toggl.
 *
 * Público pero autenticado criptográficamente: cada entrega se valida con
 * HMAC-SHA256 sobre el CUERPO CRUDO usando TOGGL_WEBHOOK_SECRET.
 *
 * ANTILOOP: este handler solo llama a `applyRemoteEntry`, que escribe en la BD
 * y no importa nunca el servicio de push. Un evento entrante no puede provocar
 * ninguna llamada saliente a Toggl.
 */
import { NextResponse } from "next/server";
import {
  verifyTogglSignature,
  parseTogglWebhook,
  webhookEntryToTogglTimeEntry,
  TOGGL_SIGNATURE_HEADER,
} from "@/integrations/toggl/webhooks";
import { applyRemoteEntry } from "@/server/services/toggl-sync-service";
import {
  recordWebhookDelivery,
  recordWebhookValidated,
  recordWebhookError,
  resolveWebhookActorId,
} from "@/server/services/toggl-webhook-service";

// El cuerpo crudo es imprescindible para la firma: nada de caché ni de
// pre-parseo por parte del framework.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Margen de frescura del evento. Fuera de él se considera un replay. */
const MAX_EVENT_AGE_MS = 10 * 60 * 1000;

function ok(body: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...body });
}

export async function POST(request: Request) {
  // 1. Content-Type: Toggl envía JSON. Cualquier otra cosa se rechaza pronto.
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  // 2. Cuerpo CRUDO, sin parsear. Firmar sobre JSON.stringify(parsed) daría
  //    un digest distinto: el orden de claves y los espacios cambian.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "unreadable_body" }, { status: 400 });
  }
  if (!rawBody) return NextResponse.json({ error: "empty_body" }, { status: 400 });

  // 3. Firma.
  const signature = request.headers.get(TOGGL_SIGNATURE_HEADER);
  const check = verifyTogglSignature(rawBody, signature, process.env.TOGGL_WEBHOOK_SECRET);
  if (!check.valid) {
    if (check.reason === "missing_secret") {
      // Fallo de configuración nuestro, no de Toggl: se anota para que se vea
      // en Integraciones, pero no se revela nada al llamante.
      await recordWebhookError("Falta TOGGL_WEBHOOK_SECRET en el servidor.").catch(() => {});
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 4. JSON válido.
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseTogglWebhook(body);

  // 5. Alta de la suscripción: Toggl manda un código y espera EXACTAMENTE
  //    {"validation_code": "<el mismo código>"} de vuelta, sin envoltorio
  //    adicional (contrato documentado; no verificado aún contra Toggl real).
  if (parsed.kind === "validation") {
    await recordWebhookValidated().catch(() => {});
    return NextResponse.json({ validation_code: parsed.validationCode });
  }

  if (parsed.kind === "ping") {
    await recordWebhookDelivery(body).catch(() => {});
    return ok({ ping: true });
  }

  if (parsed.kind === "ignored") {
    // Se responde 200 a propósito: devolver error haría que Toggl reintentara
    // y acabara desactivando la suscripción por algo que no vamos a procesar.
    await recordWebhookDelivery(body, `Evento ignorado: ${parsed.reason}`).catch(() => {});
    return ok({ ignored: parsed.reason });
  }

  // 6. Anti-replay razonable: la firma impide falsificar, pero no reenviar una
  //    entrega antigua capturada. Un evento viejo se descarta.
  if (parsed.timestamp) {
    const t = Date.parse(parsed.timestamp);
    if (Number.isFinite(t) && Math.abs(Date.now() - t) > MAX_EVENT_AGE_MS) {
      await recordWebhookDelivery(body, "Evento descartado por antigüedad (posible reenvío).").catch(
        () => {},
      );
      return ok({ ignored: "stale_event" });
    }
  }

  const actorId = await resolveWebhookActorId();
  if (!actorId) {
    await recordWebhookError("No hay ninguna usuaria a la que atribuir la entrada.").catch(() => {});
    return NextResponse.json({ error: "no_actor" }, { status: 503 });
  }

  try {
    // Única escritura del handler. `applyRemoteEntry` es idempotente y resuelve
    // conflictos comparando el "at" remoto con el que ya tenemos guardado.
    const result = await applyRemoteEntry(
      webhookEntryToTogglTimeEntry(parsed.entry, parsed.action),
      actorId,
    );
    await recordWebhookDelivery(body).catch(() => {});
    return ok({ action: parsed.action, result: result.action });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error desconocido";
    await recordWebhookError(message).catch(() => {});
    // 500 para que Toggl reintente: el evento era válido y no se ha aplicado.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

/**
 * Toggl puede comprobar el endpoint con un GET. No se procesa nada aquí.
 */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "toggl-webhook" });
}
