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

/**
 * Envía a todas las suscripciones activas (app de una sola persona / equipo
 * pequeño: no hay destinatario individual que resolver). Una suscripción
 * caducada (404/410) se borra para no reintentar en vano.
 */
export async function broadcastPush(payload: PushPayload) {
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
