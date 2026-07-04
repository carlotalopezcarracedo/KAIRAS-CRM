"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  leadCreateSchema,
  leadUpdateSchema,
  leadStatusSchema,
  interactionCreateSchema,
  noteCreateSchema,
} from "@/server/validators/lead";
import {
  createLead,
  updateLead,
  changeLeadStatus,
  softDeleteLead,
  addLeadInteraction,
  addLeadNote,
} from "@/server/services/lead-service";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flat = z.flattenError(error);
  return flat.fieldErrors as Record<string, string[]>;
}

export async function createLeadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = leadCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  let leadId: string;
  try {
    const lead = await createLead(user.id, parsed.data);
    leadId = lead.id;
  } catch (err) {
    console.error("[createLeadAction]", err);
    return { ok: false, error: "No se pudo crear el lead. Inténtalo de nuevo." };
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect(`/leads/${leadId}`);
}

export async function updateLeadAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = leadUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateLead(user.id, leadId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[updateLeadAction]", err);
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function changeLeadStatusAction(
  leadId: string,
  status: string,
  lostReason?: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = leadStatusSchema.safeParse({ status, lostReason });
  if (!parsed.success) {
    return { ok: false, error: "Estado no válido." };
  }

  try {
    await changeLeadStatus(
      user.id,
      leadId,
      parsed.data.status,
      parsed.data.lostReason,
    );
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[changeLeadStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  try {
    await softDeleteLead(user.id, leadId);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[deleteLeadAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}

export async function addInteractionAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = interactionCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await addLeadInteraction(user.id, leadId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[addInteractionAction]", err);
    return { ok: false, error: "No se pudo registrar la interacción." };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addNoteAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = noteCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await addLeadNote(user.id, leadId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este lead ya no existe." };
    }
    console.error("[addNoteAction]", err);
    return { ok: false, error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}
