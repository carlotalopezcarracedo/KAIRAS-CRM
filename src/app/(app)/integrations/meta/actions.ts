"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { processPendingEvents } from "@/integrations/meta/conversions-api";
import type { ActionResult } from "@/lib/action-result";

export async function processMetaQueueAction(): Promise<
  ActionResult & { sent?: number; failed?: number; configured?: boolean }
> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  try {
    const result = await processPendingEvents(user.id);
    revalidatePath("/integrations/meta");
    revalidatePath("/integrations");
    if (!result.configured) {
      return {
        ok: false,
        error:
          "Meta CAPI no está configurada. Añade META_PIXEL_ID y META_ACCESS_TOKEN en .env para poder enviar.",
        configured: false,
      };
    }
    return { ok: true, ...result };
  } catch (err) {
    console.error("[processMetaQueueAction]", err);
    return { ok: false, error: "Error procesando la cola de eventos." };
  }
}
