import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { saveSubscription } from "@/server/services/push-service";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "No autorizada" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Cuerpo no válido" }, { status: 400 });
  }

  await saveSubscription(user.id, parsed.data, request.headers.get("user-agent") ?? undefined);
  return NextResponse.json({ ok: true });
}
