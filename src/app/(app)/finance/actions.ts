"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  invoiceDraftSchema,
  invoiceFromHoursSchema,
  invoiceRecordSchema,
  DRAFT_STATUSES,
  INVOICE_RECORD_STATUSES,
} from "@/server/validators/invoice";
import {
  createDraft,
  createDraftFromHours,
  setDraftStatus,
  createRecord,
  setRecordStatus,
} from "@/server/services/invoice-service";
import type { ActionResult } from "@/lib/action-result";
import type { InvoiceDraftStatus, InvoiceStatus } from "@prisma/client";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
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

function revalidateFinance() {
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/time");
}

export async function createDraftAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = invoiceDraftSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await createDraft(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createDraftAction]", err);
    return { ok: false, error: "No se pudo crear la solicitud." };
  }

  revalidateFinance();
  redirect("/finance");
}

export async function createDraftFromHoursAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = invoiceFromHoursSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await createDraftFromHours(auth.userId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_HOURS") {
      return {
        ok: false,
        error:
          "Este cliente no tiene horas aprobadas sin facturar. Aprueba entradas en Tiempo primero.",
      };
    }
    console.error("[createDraftFromHoursAction]", err);
    return { ok: false, error: "No se pudo crear la solicitud." };
  }

  revalidateFinance();
  redirect("/finance");
}

export async function setDraftStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  if (!(DRAFT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado no válido." };
  }

  try {
    await setDraftStatus(auth.userId, id, status as InvoiceDraftStatus);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta solicitud ya no existe." };
    }
    console.error("[setDraftStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidateFinance();
  return { ok: true };
}

export async function createRecordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = invoiceRecordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const linkDraftId = formData.get("linkDraftId");

  try {
    await createRecord(
      auth.userId,
      parsed.data,
      typeof linkDraftId === "string" && linkDraftId ? linkDraftId : undefined,
    );
  } catch (err) {
    console.error("[createRecordAction]", err);
    return { ok: false, error: "No se pudo registrar la factura." };
  }

  revalidateFinance();
  return { ok: true };
}

export async function setRecordStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  if (!(INVOICE_RECORD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado no válido." };
  }

  try {
    await setRecordStatus(auth.userId, id, status as InvoiceStatus);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta factura ya no existe." };
    }
    console.error("[setRecordStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidateFinance();
  return { ok: true };
}
