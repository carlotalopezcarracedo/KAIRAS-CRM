"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { recurringSchema } from "@/server/validators/catalog";
import {
  createRecurring,
  updateRecurring,
  softDeleteRecurring,
  generateRecurringInvoiceDraft,
} from "@/server/services/catalog-service";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

async function withUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }
}

export async function createRecurringAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = recurringSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createRecurring(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createRecurringAction]", err);
    return { ok: false, error: "No se pudo crear el recurrente." };
  }

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  redirect("/recurring");
}

export async function updateRecurringAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = recurringSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateRecurring(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este recurrente ya no existe." };
    }
    console.error("[updateRecurringAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  redirect("/recurring");
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteRecurring(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este recurrente ya no existe." };
    }
    console.error("[deleteRecurringAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function generateInvoiceDraftAction(
  id: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await generateRecurringInvoiceDraft(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este recurrente ya no existe." };
    }
    console.error("[generateInvoiceDraftAction]", err);
    return { ok: false, error: "No se pudo generar la solicitud." };
  }

  revalidatePath("/recurring");
  revalidatePath("/finance");
  return { ok: true };
}
