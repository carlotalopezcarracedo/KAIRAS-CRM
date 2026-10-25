import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { broadcastPush, isPushConfigured } from "@/server/services/push-service";

export const dynamic = "force-dynamic";

/** Manda un aviso de prueba a todos los dispositivos suscritos (Ajustes → Notificaciones). */
export async function POST() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "No autorizada" }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Faltan las claves VAPID en el servidor (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)." },
      { status: 503 },
    );
  }

  const result = await broadcastPush({
    title: "KAIRAS · prueba",
    body: "Si ves este aviso, las notificaciones funcionan.",
    url: "/settings",
    tag: "test",
  });
  if (result.subscriptions === 0) {
    return NextResponse.json(
      { error: "No hay ningún dispositivo suscrito. Pulsa «Activar en este dispositivo»." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
