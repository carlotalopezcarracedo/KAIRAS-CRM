import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { getSetting, setSetting } from "@/server/services/settings-service";
import { buildIcsCalendar, type IcsEvent } from "@/lib/ics";
import { addDays } from "@/lib/dates";

/**
 * Publicación del calendario como feed iCalendar suscribible.
 *
 * El feed va sin sesión (lo pide el iPhone o Google, no un navegador con
 * cookies), así que el secreto es el propio token de la URL: 48 caracteres
 * aleatorios. Se puede regenerar, lo que invalida al instante la URL anterior.
 *
 * Es de SOLO LECTURA: KAIRAS publica, el móvil consume. Lo que crees en el
 * iPhone no vuelve aquí.
 */

const FEED_SETTING_KEY = "calendar.feed";

/** Ventana publicada: suficiente historial para contexto y un año por delante. */
const PAST_DAYS = 90;
const FUTURE_DAYS = 365;

type FeedSettings = { token: string | null };

export async function getCalendarFeedToken(): Promise<string | null> {
  const stored = await getSetting<FeedSettings>(FEED_SETTING_KEY, { token: null });
  return stored.token ?? null;
}

export async function ensureCalendarFeedToken(actorId: string): Promise<string> {
  const existing = await getCalendarFeedToken();
  if (existing) return existing;
  return regenerateCalendarFeedToken(actorId);
}

export async function regenerateCalendarFeedToken(actorId: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await setSetting(FEED_SETTING_KEY, { token } satisfies FeedSettings);
  await audit({
    actorId,
    action: "update",
    entityType: "Settings",
    metadata: { key: FEED_SETTING_KEY, regenerated: true },
  });
  return token;
}

export async function disableCalendarFeed(actorId: string): Promise<void> {
  await setSetting(FEED_SETTING_KEY, { token: null } satisfies FeedSettings);
  await audit({
    actorId,
    action: "update",
    entityType: "Settings",
    metadata: { key: FEED_SETTING_KEY, disabled: true },
  });
}

/**
 * Compara en tiempo constante. Con `===` el tiempo de respuesta depende de
 * cuántos caracteres coinciden, lo que permite adivinar el token byte a byte.
 */
export function tokenMatches(provided: string, expected: string | null): boolean {
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Contexto legible: a qué cliente o proyecto pertenece el evento. */
function describeEvent(event: {
  description: string | null;
  client: { name: string } | null;
  project: { name: string } | null;
  lead: { name: string } | null;
}): string | null {
  const context = [
    event.client ? `Cliente: ${event.client.name}` : null,
    event.project ? `Proyecto: ${event.project.name}` : null,
    event.lead ? `Lead: ${event.lead.name}` : null,
  ].filter(Boolean);

  const parts = [event.description, context.join("\n")].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export async function buildCalendarFeed(appUrl: string): Promise<string> {
  const now = new Date();

  const events = await prisma.calendarEvent.findMany({
    where: {
      deletedAt: null,
      startAt: { gte: addDays(now, -PAST_DAYS), lte: addDays(now, FUTURE_DAYS) },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      location: true,
      status: true,
      type: true,
      updatedAt: true,
      client: { select: { name: true } },
      project: { select: { name: true } },
      lead: { select: { name: true } },
    },
  });

  // El UID debe ser estable entre refrescos: si cambia, el móvil borra el
  // evento y lo vuelve a crear, perdiendo avisos y cambios locales.
  const host = (() => {
    try {
      return new URL(appUrl).host;
    } catch {
      return "kairas";
    }
  })();

  const icsEvents: IcsEvent[] = events.map((event) => ({
    uid: `${event.id}@${host}`,
    start: event.startAt,
    end: event.endAt,
    allDay: event.allDay,
    summary: event.title,
    description: describeEvent(event),
    location: event.location,
    // Los cancelados se publican como CANCELLED en vez de desaparecer: así el
    // móvil los quita en vez de dejarlos colgados de un refresco anterior.
    cancelled: event.status === "cancelled",
    updatedAt: event.updatedAt,
  }));

  return buildIcsCalendar(icsEvents, {
    name: "KAIRAS",
    description: "Agenda de KAIRAS OS",
    now,
  });
}
