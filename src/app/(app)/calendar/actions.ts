"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { eventCreateSchema } from "@/server/validators/calendar";
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/server/services/calendar-service";
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

export async function createEventAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = eventCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await createEvent(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createEventAction]", err);
    return { ok: false, error: "No se pudo crear el evento." };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEventAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = eventCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateEvent(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este evento ya no existe." };
    }
    console.error("[updateEventAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/calendar");
  revalidatePath(`/calendar/event/${id}`);
  return { ok: true };
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await deleteEvent(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este evento ya no existe." };
    }
    console.error("[deleteEventAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}
