"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { campaignSchema } from "@/server/validators/campaign";
import {
  createCampaign,
  updateCampaign,
  softDeleteCampaign,
} from "@/server/services/campaign-service";
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

export async function createCampaignAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = campaignSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createCampaign(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createCampaignAction]", err);
    return { ok: false, error: "No se pudo crear la campaña." };
  }

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function updateCampaignAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = campaignSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateCampaign(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta campaña ya no existe." };
    }
    console.error("[updateCampaignAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/campaigns");
  redirect("/campaigns");
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteCampaign(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta campaña ya no existe." };
    }
    console.error("[deleteCampaignAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/campaigns");
  redirect("/campaigns");
}
