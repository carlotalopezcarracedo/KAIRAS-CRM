"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  clientCreateSchema,
  clientUpdateSchema,
  contactCreateSchema,
} from "@/server/validators/client";
import { noteCreateSchema } from "@/server/validators/lead";
import {
  createClient,
  updateClient,
  softDeleteClient,
  convertLeadToClient,
  addClientContact,
} from "@/server/services/client-service";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
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

export async function createClientAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = clientCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  let id: string;
  try {
    const client = await createClient(auth.userId, parsed.data);
    id = client.id;
  } catch (err) {
    console.error("[createClientAction]", err);
    return { ok: false, error: "No se pudo crear el cliente." };
  }

  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = clientUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateClient(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este cliente ya no existe." };
    }
    console.error("[updateClientAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteClient(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este cliente ya no existe." };
    }
    console.error("[deleteClientAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function convertLeadAction(leadId: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  let clientId: string;
  try {
    const result = await convertLeadToClient(auth.userId, leadId);
    clientId = result.clientId;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[convertLeadAction]", err);
    return { ok: false, error: "No se pudo convertir el lead." };
  }

  revalidatePath("/clients");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/clients/${clientId}`);
}

export async function addContactAction(
  clientId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = contactCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await addClientContact(auth.userId, clientId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este cliente ya no existe." };
    }
    console.error("[addContactAction]", err);
    return { ok: false, error: "No se pudo añadir el contacto." };
  }

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function addClientNoteAction(
  clientId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = noteCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "La nota no puede estar vacía.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, deletedAt: null },
  });
  if (!client) return { ok: false, error: "Este cliente ya no existe." };

  try {
    const note = await prisma.note.create({
      data: { clientId, title: parsed.data.title, content: parsed.data.content },
    });
    await audit({
      actorId: auth.userId,
      action: "create",
      entityType: "Note",
      entityId: note.id,
      metadata: { clientId },
    });
  } catch (err) {
    console.error("[addClientNoteAction]", err);
    return { ok: false, error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}
