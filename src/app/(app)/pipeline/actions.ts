"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  opportunityCreateSchema,
  opportunityUpdateSchema,
  stageChangeSchema,
} from "@/server/validators/opportunity";
import {
  createOpportunity,
  updateOpportunity,
  changeOpportunityStage,
  softDeleteOpportunity,
} from "@/server/services/opportunity-service";
import { noteCreateSchema } from "@/server/validators/lead";
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

export async function createOpportunityAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = opportunityCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  let id: string;
  try {
    const opp = await createOpportunity(user.id, parsed.data);
    id = opp.id;
  } catch (err) {
    console.error("[createOpportunityAction]", err);
    return { ok: false, error: "No se pudo crear la oportunidad." };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/pipeline/${id}`);
}

export async function updateOpportunityAction(
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

  const parsed = opportunityUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateOpportunity(user.id, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta oportunidad ya no existe." };
    }
    console.error("[updateOpportunityAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${id}`);
  redirect(`/pipeline/${id}`);
}

export async function changeStageAction(
  id: string,
  stage: string,
  extra?: { lostReason?: string; acceptedValue?: string },
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  const parsed = stageChangeSchema.safeParse({
    stage,
    lostReason: extra?.lostReason ?? "",
    acceptedValue: extra?.acceptedValue ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Etapa no válida." };

  try {
    await changeOpportunityStage(user.id, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta oportunidad ya no existe." };
    }
    console.error("[changeStageAction]", err);
    return { ok: false, error: "No se pudo cambiar la etapa." };
  }

  revalidatePath("/pipeline");
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  return { ok: true };
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }

  try {
    await softDeleteOpportunity(user.id, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta oportunidad ya no existe." };
    }
    console.error("[deleteOpportunityAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/pipeline");
  redirect("/pipeline");
}

export async function addOpportunityNoteAction(
  opportunityId: string,
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
      error: "Revisa los campos.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, deletedAt: null },
  });
  if (!opp) return { ok: false, error: "Esta oportunidad ya no existe." };

  try {
    const note = await prisma.note.create({
      data: { opportunityId, title: parsed.data.title, content: parsed.data.content },
    });
    await audit({
      actorId: user.id,
      action: "create",
      entityType: "Note",
      entityId: note.id,
      metadata: { opportunityId },
    });
  } catch (err) {
    console.error("[addOpportunityNoteAction]", err);
    return { ok: false, error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/pipeline/${opportunityId}`);
  return { ok: true };
}
