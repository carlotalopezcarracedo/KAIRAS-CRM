import webpush from "web-push";
import { prisma } from "@/server/db/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

const configured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);
if (configured) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent,
    },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  });
}

export async function deleteSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export type PushResult = { sent: number; failed: number; subscriptions: number };

export function isPushConfigured() {
  return configured;
}

/**
 * Envía a todas las suscripciones activas (app de una sola persona / equipo
 * pequeño: no hay destinatario individual que resolver). Una suscripción
 * caducada (404/410) se borra para no reintentar en vano. Devuelve cuántas
 * entregas salieron bien para que el llamador decida si el aviso cuenta como
 * enviado. `urgency: high` evita que Android en reposo (Doze) retrase el aviso.
 */
export async function broadcastPush(payload: PushPayload): Promise<PushResult> {
  if (!configured) return { sent: 0, failed: 0, subscriptions: 0 };

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, failed: 0, subscriptions: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        console.error("[push] envío fallido", statusCode, sub.endpoint.slice(0, 60));
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
  return { sent, failed, subscriptions: subs.length };
}
