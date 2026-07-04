import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type { MetaEventName, Prisma } from "@prisma/client";

/**
 * Meta Conversions API — capa de integración.
 *
 * Sin credenciales (META_PIXEL_ID / META_ACCESS_TOKEN vacíos) el módulo
 * REGISTRA eventos en MetaEventLog pero NUNCA llama a Meta. Con credenciales,
 * `processPendingEvents` envía la cola con deduplicación por event_id.
 */

export type MetaConfig = {
  configured: boolean;
  pixelId: string | null;
  apiVersion: string;
  testEventCode: string | null;
};

export function getMetaConfig(): MetaConfig {
  const pixelId = process.env.META_PIXEL_ID?.trim() || null;
  const accessToken = process.env.META_ACCESS_TOKEN?.trim() || null;
  return {
    configured: !!(pixelId && accessToken),
    pixelId,
    apiVersion: process.env.META_API_VERSION?.trim() || "v23.0",
    testEventCode: process.env.META_TEST_EVENT_CODE?.trim() || null,
  };
}

export function hashSha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Mapeo evento interno → nombre de evento Meta. */
export const META_EVENT_MAPPING: Record<
  MetaEventName,
  { metaName: string; custom: boolean }
> = {
  lead_created: { metaName: "Lead", custom: false },
  lead_contacted: { metaName: "Contact", custom: false },
  meeting_scheduled: { metaName: "Schedule", custom: false },
  diagnosis_done: { metaName: "DiagnosisDone", custom: true },
  proposal_sent: { metaName: "ProposalSent", custom: true },
  qualified_lead: { metaName: "QualifiedLead", custom: true },
  deal_won: { metaName: "Purchase", custom: false },
  invoice_paid: { metaName: "Purchase", custom: false },
  recurring_client_started: { metaName: "Subscribe", custom: false },
};

const CONSENT_OK = new Set(["explicit_consent", "legitimate_interest"]);

/**
 * Registra un evento interno en la cola. Solo incluye datos personales
 * (hasheados SHA-256) si el lead tiene base legal de contacto.
 * Nunca lanza: la captación no debe romper el flujo comercial.
 */
export async function recordInternalEvent(params: {
  event: MetaEventName;
  leadId?: string | null;
  value?: number | null;
  currency?: string;
}) {
  try {
    const config = getMetaConfig();
    const mapping = META_EVENT_MAPPING[params.event];

    let hashedEmail: string | null = null;
    let hashedPhone: string | null = null;
    let fbp: string | null = null;
    let fbc: string | null = null;
    let consentOk = false;

    if (params.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: params.leadId },
        select: {
          email: true,
          phone: true,
          metaFbp: true,
          metaClickId: true,
          consentStatus: true,
        },
      });
      if (lead) {
        consentOk = CONSENT_OK.has(lead.consentStatus);
        if (consentOk) {
          hashedEmail = lead.email ? hashSha256(lead.email) : null;
          hashedPhone = lead.phone ? hashSha256(lead.phone.replace(/\s+/g, "")) : null;
        }
        // fbp/fbc son identificadores de navegador, no PII directa
        fbp = lead.metaFbp;
        fbc = lead.metaClickId;
      }
    }

    await prisma.metaEventLog.create({
      data: {
        internalEvent: params.event,
        metaEventName: mapping.metaName,
        eventId: randomUUID(),
        leadId: params.leadId ?? null,
        hashedEmail,
        hashedPhone,
        fbp,
        fbc,
        eventValue: params.value ?? null,
        currency: params.value != null ? (params.currency ?? "EUR") : null,
        status: consentOk || !params.leadId ? "pending" : "skipped_no_consent",
        testMode: !!config.testEventCode || !config.configured,
      },
    });
  } catch (err) {
    console.error("[meta] error registrando evento", err);
  }
}

const MAX_ATTEMPTS = 3;

/**
 * Procesa la cola de eventos pendientes. Sin credenciales devuelve
 * `configured: false` y no toca nada. Con credenciales envía por lotes
 * con reintentos (máx. 3 por evento).
 */
export async function processPendingEvents(actorId: string): Promise<{
  configured: boolean;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const config = getMetaConfig();
  if (!config.configured) {
    return { configured: false, sent: 0, failed: 0, skipped: 0 };
  }

  const pending = await prisma.metaEventLog.findMany({
    where: { status: { in: ["pending", "failed"] }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let failed = 0;

  for (const event of pending) {
    const userData: Record<string, unknown> = {};
    if (event.hashedEmail) userData.em = [event.hashedEmail];
    if (event.hashedPhone) userData.ph = [event.hashedPhone];
    if (event.fbp) userData.fbp = event.fbp;
    if (event.fbc) userData.fbc = event.fbc;

    // Meta exige al menos un identificador de usuario
    if (Object.keys(userData).length === 0) {
      await prisma.metaEventLog.update({
        where: { id: event.id },
        data: {
          status: "skipped_no_consent",
          lastError: "Sin identificadores de usuario (consent o fbp/fbc)",
        },
      });
      continue;
    }

    const payload = {
      data: [
        {
          event_name: event.metaEventName,
          event_time: Math.floor(event.eventTime.getTime() / 1000),
          event_id: event.eventId,
          action_source: "system_generated",
          user_data: userData,
          ...(event.eventValue
            ? {
                custom_data: {
                  value: Number(event.eventValue),
                  currency: event.currency ?? "EUR",
                },
              }
            : {}),
        },
      ],
      ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/${config.apiVersion}/${config.pixelId}/events?access_token=${process.env.META_ACCESS_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as Prisma.InputJsonValue;

      if (response.ok) {
        await prisma.metaEventLog.update({
          where: { id: event.id },
          data: {
            status: config.testEventCode ? "test" : "sent",
            sentAt: new Date(),
            attempts: { increment: 1 },
            metaResponse: body,
            lastError: null,
          },
        });
        sent += 1;
      } else {
        await prisma.metaEventLog.update({
          where: { id: event.id },
          data: {
            status: "failed",
            attempts: { increment: 1 },
            metaResponse: body,
            lastError: `HTTP ${response.status}`,
          },
        });
        failed += 1;
      }
    } catch (err) {
      await prisma.metaEventLog.update({
        where: { id: event.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: err instanceof Error ? err.message : "Error de red",
        },
      });
      failed += 1;
    }
  }

  await audit({
    actorId,
    action: "meta_event",
    entityType: "MetaEventLog",
    metadata: { processed: pending.length, sent, failed },
  });

  return {
    configured: true,
    sent,
    failed,
    skipped: pending.length - sent - failed,
  };
}
