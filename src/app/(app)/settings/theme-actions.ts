"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_COOKIE, isTheme } from "@/lib/theme";
import type { ActionResult } from "@/lib/action-result";

/**
 * El tema es una preferencia del navegador, no un dato de negocio: va en
 * cookie y no toca la base. No requiere sesión por el mismo motivo, pero la
 * cookie es del sitio, así que solo la ve quien ya está dentro.
 */
export async function setThemeAction(value: string): Promise<ActionResult> {
  if (!isTheme(value)) return { ok: false, error: "Tema no válido." };

  const store = await cookies();
  store.set(THEME_COOKIE, value, {
    httpOnly: false, // solo es estética: no hay motivo para esconderla
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // El layout raíz lee la cookie, así que hay que revalidar desde la raíz.
  revalidatePath("/", "layout");
  return { ok: true };
}
