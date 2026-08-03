"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  timerStartSchema,
  timeEntryCreateSchema,
  TIME_ENTRY_STATUSES,
} from "@/server/validators/time";
import {
  startTimer,
  stopTimer,
  discardTimer,
  createManualEntry,
  updateEntry,
  setEntryStatus,
  softDeleteEntry,
  getTimeEntryExtraOptions,
} from "@/server/services/time-service";
import type { ActionResult } from "@/lib/action-result";
import type { TimeEntryStatus } from "@prisma/client";

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

function revalidateTimePaths() {
  revalidatePath("/time");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/", "layout"); // refresca el widget del topbar
}

export async function getTimeEntryExtraOptionsAction() {
  const auth = await withUser();
  if (!auth.ok) return { services: [], tasks: [] };
  return getTimeEntryExtraOptions();
}

export async function startTimerAction(input: {
  title?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  serviceId?: string;
  workType?: string;
  billable?: boolean;
}): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = timerStartSchema.safeParse({
    title: input.title ?? "",
    clientId: input.clientId ?? "",
    projectId: input.projectId ?? "",
    taskId: input.taskId ?? "",
    serviceId: input.serviceId ?? "",
    workType: input.workType ?? "other",
    billable: input.billable ?? true,
  });
  if (!parsed.success) return { ok: false, error: "Datos de cronómetro no válidos." };

  try {
    await startTimer(auth.userId, parsed.data);
  } catch (err) {
    console.error("[startTimerAction]", err);
    return { ok: false, error: "No se pudo iniciar el cronómetro." };
  }

  revalidateTimePaths();
  return { ok: true };
}

export async function stopTimerAction(): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await stopTimer(auth.userId);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_TIMER") {
      return { ok: false, error: "No hay ningún cronómetro activo." };
    }
    console.error("[stopTimerAction]", err);
    return { ok: false, error: "No se pudo parar el cronómetro." };
  }

  revalidateTimePaths();
  return { ok: true };
}

export async function discardTimerAction(): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await discardTimer(auth.userId);
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_TIMER") {
      return { ok: false, error: "No hay ningún cronómetro activo." };
    }
    console.error("[discardTimerAction]", err);
    return { ok: false, error: "No se pudo descartar." };
  }

  revalidateTimePaths();
  return { ok: true };
}

export async function createEntryAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = timeEntryCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await createManualEntry(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createEntryAction]", err);
    return { ok: false, error: "No se pudo registrar la entrada." };
  }

  revalidateTimePaths();
  return { ok: true };
}

export async function updateEntryAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = timeEntryCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateEntry(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta entrada ya no existe." };
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return {
        ok: false,
        error: "Entrada bloqueada: ya está en cola de factura o facturada.",
      };
    }
    console.error("[updateEntryAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidateTimePaths();
  revalidatePath(`/time/${id}`);
  return { ok: true };
}

export async function setEntryStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  if (!(TIME_ENTRY_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado no válido." };
  }

  try {
    await setEntryStatus(auth.userId, id, status as TimeEntryStatus);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta entrada ya no existe." };
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return { ok: false, error: "Entrada bloqueada." };
    }
    console.error("[setEntryStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidateTimePaths();
  return { ok: true };
}

export async function deleteEntryAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteEntry(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta entrada ya no existe." };
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return {
        ok: false,
        error: "Entrada bloqueada: ya está en cola de factura o facturada.",
      };
    }
    console.error("[deleteEntryAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidateTimePaths();
  return { ok: true };
}
