"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { taskCreateSchema, taskUpdateSchema } from "@/server/validators/task";
import {
  createTask,
  updateTask,
  setTaskStatus,
  toggleChecklistItem,
  softDeleteTask,
} from "@/server/services/task-service";
import type { ActionResult } from "@/lib/action-result";
import type { TaskStatus } from "@prisma/client";

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

function revalidateTaskPaths() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function createTaskAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = taskCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await createTask(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createTaskAction]", err);
    return { ok: false, error: "No se pudo crear la tarea." };
  }

  revalidateTaskPaths();
  if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function updateTaskAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = taskUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateTask(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta tarea ya no existe." };
    }
    console.error("[updateTaskAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidateTaskPaths();
  revalidatePath(`/tasks/${id}`);
  return { ok: true };
}

export async function setTaskStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const valid: TaskStatus[] = ["todo", "in_progress", "waiting", "done", "cancelled"];
  if (!valid.includes(status as TaskStatus)) {
    return { ok: false, error: "Estado no válido." };
  }

  try {
    await setTaskStatus(auth.userId, id, status as TaskStatus);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta tarea ya no existe." };
    }
    console.error("[setTaskStatusAction]", err);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  revalidateTaskPaths();
  return { ok: true };
}

export async function toggleChecklistAction(
  id: string,
  index: number,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await toggleChecklistItem(auth.userId, id, index);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Elemento no encontrado." };
    }
    console.error("[toggleChecklistAction]", err);
    return { ok: false, error: "No se pudo actualizar el checklist." };
  }

  revalidatePath(`/tasks/${id}`);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteTask(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Esta tarea ya no existe." };
    }
    console.error("[deleteTaskAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidateTaskPaths();
  redirect("/tasks");
}
