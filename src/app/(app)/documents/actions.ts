"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { adminDocumentSchema } from "@/server/validators/admin-document";
import {
  createAdminDocument,
  updateAdminDocument,
  softDeleteAdminDocument,
} from "@/server/services/admin-document-service";
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

export async function createAdminDocumentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = adminDocumentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  let id: string;
  try {
    const created = await createAdminDocument(auth.userId, parsed.data);
    id = created.id;
  } catch (err) {
    console.error("[createAdminDocumentAction]", err);
    return { ok: false, error: "No se pudo crear el documento." };
  }

  revalidatePath("/documents");
  // Va directo a la ficha: el siguiente paso natural es adjuntar el archivo.
  redirect(`/documents/${id}`);
}

export async function updateAdminDocumentAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = adminDocumentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateAdminDocument(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este documento ya no existe." };
    }
    console.error("[updateAdminDocumentAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function deleteAdminDocumentAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteAdminDocument(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este documento ya no existe." };
    }
    console.error("[deleteAdminDocumentAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/documents");
  redirect("/documents");
}
