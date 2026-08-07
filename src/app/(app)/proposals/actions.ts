"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { proposalSchema, PROPOSAL_STATUSES } from "@/server/validators/proposal";
import {
  createProposal,
  updateProposal,
  setProposalStatus,
  createProposalVersion,
  softDeleteProposal,
} from "@/server/services/proposal-service";
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

export async function createProposalAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = proposalSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createProposal(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createProposalAction]", err);
    return { ok: false, error: "No se pudo crear la propuesta." };
  }

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  redirect("/proposals");
}

export async function updateProposalAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = proposalSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateProposal(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta propuesta ya no existe." };
    }
    console.error("[updateProposalAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  redirect("/proposals");
}

export async function setProposalStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = z.enum(PROPOSAL_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Estado no válido." };

  try {
    await setProposalStatus(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta propuesta ya no existe." };
    }
    console.error("[setProposalStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createProposalVersionAction(
  id: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  let nextId: string;
  try {
    const next = await createProposalVersion(auth.userId, id);
    nextId = next.id;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta propuesta ya no existe." };
    }
    console.error("[createProposalVersionAction]", err);
    return { ok: false, error: "No se pudo crear la versión." };
  }

  revalidatePath("/proposals");
  redirect(`/proposals/${nextId}/edit`);
}

export async function deleteProposalAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteProposal(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta propuesta ya no existe." };
    }
    console.error("[deleteProposalAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/proposals");
  redirect("/proposals");
}
