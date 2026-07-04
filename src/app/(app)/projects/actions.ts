"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import {
  projectCreateSchema,
  projectUpdateSchema,
} from "@/server/validators/project";
import {
  createProject,
  updateProject,
  softDeleteProject,
} from "@/server/services/project-service";
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

export async function createProjectAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = projectCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  let id: string;
  try {
    const project = await createProject(auth.userId, parsed.data);
    id = project.id;
  } catch (err) {
    if (err instanceof Error && err.message === "CLIENT_NOT_FOUND") {
      return { ok: false, error: "El cliente seleccionado no existe." };
    }
    console.error("[createProjectAction]", err);
    return { ok: false, error: "No se pudo crear el proyecto." };
  }

  revalidatePath("/projects");
  revalidatePath("/clients");
  redirect(`/projects/${id}`);
}

export async function updateProjectAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = projectUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  try {
    await updateProject(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este proyecto ya no existe." };
    }
    console.error("[updateProjectAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteProject(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este proyecto ya no existe." };
    }
    console.error("[deleteProjectAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function addProjectNoteAction(
  projectId: string,
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

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });
  if (!project) return { ok: false, error: "Este proyecto ya no existe." };

  try {
    const note = await prisma.note.create({
      data: { projectId, title: parsed.data.title, content: parsed.data.content },
    });
    await audit({
      actorId: auth.userId,
      action: "create",
      entityType: "Note",
      entityId: note.id,
      metadata: { projectId },
    });
  } catch (err) {
    console.error("[addProjectNoteAction]", err);
    return { ok: false, error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
