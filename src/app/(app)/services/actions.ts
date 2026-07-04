"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { serviceSchema } from "@/server/validators/catalog";
import { createService, updateService } from "@/server/services/catalog-service";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

export async function createServiceAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = serviceSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createService(user.id, parsed.data);
  } catch (err) {
    console.error("[createServiceAction]", err);
    return { ok: false, error: "No se pudo crear el servicio." };
  }

  revalidatePath("/services");
  redirect("/services");
}

export async function updateServiceAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = serviceSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateService(user.id, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este servicio ya no existe." };
    }
    console.error("[updateServiceAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/services");
  redirect("/services");
}
