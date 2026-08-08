"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import {
  ensureCalendarFeedToken,
  regenerateCalendarFeedToken,
  disableCalendarFeed,
} from "@/server/services/calendar-feed-service";

export type FeedActionResult =
  | { ok: true; token: string | null }
  | { ok: false; error: string };

async function withUser() {
  try {
    const user = await requireUser();
    return { ok: true as const, userId: user.id };
  } catch {
    return { ok: false as const, error: "Sesión caducada. Vuelve a entrar." };
  }
}

export async function enableCalendarFeedAction(): Promise<FeedActionResult> {
  const auth = await withUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const token = await ensureCalendarFeedToken(auth.userId);
    revalidatePath("/settings");
    return { ok: true, token };
  } catch (err) {
    console.error("[enableCalendarFeedAction]", err);
    return { ok: false, error: "No se pudo activar el calendario." };
  }
}

export async function regenerateCalendarFeedAction(): Promise<FeedActionResult> {
  const auth = await withUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const token = await regenerateCalendarFeedToken(auth.userId);
    revalidatePath("/settings");
    return { ok: true, token };
  } catch (err) {
    console.error("[regenerateCalendarFeedAction]", err);
    return { ok: false, error: "No se pudo regenerar el enlace." };
  }
}

export async function disableCalendarFeedAction(): Promise<FeedActionResult> {
  const auth = await withUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    await disableCalendarFeed(auth.userId);
    revalidatePath("/settings");
    return { ok: true, token: null };
  } catch (err) {
    console.error("[disableCalendarFeedAction]", err);
    return { ok: false, error: "No se pudo desactivar el calendario." };
  }
}
