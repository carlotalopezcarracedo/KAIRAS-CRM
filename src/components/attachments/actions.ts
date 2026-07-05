"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  deleteAttachment,
  addExternalLink,
  ATTACHMENT_ENTITY_TYPES,
  type AttachmentEntityType,
} from "@/server/services/attachment-service";
import type { ActionResult } from "@/lib/action-result";

export async function deleteAttachmentAction(
  id: string,
  revalidate: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  try {
    await deleteAttachment(user.id, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este archivo ya no existe." };
    }
    console.error("[deleteAttachmentAction]", err);
    return { ok: false, error: "No se pudo eliminar el archivo." };
  }

  revalidatePath(revalidate);
  return { ok: true };
}

const linkSchema = z.object({
  name: z.string().trim().min(2, "Ponle un nombre"),
  url: z.url("URL no válida"),
  kind: z.string().default("other"),
});

export async function addExternalLinkAction(
  entityType: string,
  entityId: string,
  revalidate: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  if (!(ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    return { ok: false, error: "Entidad no válida." };
  }

  const parsed = linkSchema.safeParse({
    name: formData.get("name") ?? "",
    url: formData.get("url") ?? "",
    kind: formData.get("kind") ?? "other",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await addExternalLink({
      userId: user.id,
      entityType: entityType as AttachmentEntityType,
      entityId,
      ...parsed.data,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ENTITY_NOT_FOUND") {
      return { ok: false, error: "La entidad asociada ya no existe." };
    }
    console.error("[addExternalLinkAction]", err);
    return { ok: false, error: "No se pudo guardar el enlace." };
  }

  revalidatePath(revalidate);
  return { ok: true };
}
