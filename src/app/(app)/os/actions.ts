"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import type { ActionResult } from "@/lib/action-result";
import {
  entryCreateSchema,
  entryUpdateSchema,
  relationCreateSchema,
} from "@/server/validators/os/knowledge";
import {
  createEntry,
  updateEntry,
  softDeleteEntry,
  addRelation,
  removeRelation,
  toggleFavorite,
} from "@/server/services/os/knowledge-service";

function fields(e: z.ZodError): Record<string, string[]> {
  return z.flattenError(e).fieldErrors as Record<string, string[]>;
}

async function withUser() {
  try {
    const u = await requireUser();
    return { ok: true as const, userId: u.id };
  } catch {
    return { ok: false as const, error: "Sesión caducada. Vuelve a entrar." };
  }
}

function revalidateOs(area?: string) {
  revalidatePath("/os");
  if (area) revalidatePath(`/os/${area}`);
}

function toObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export async function createEntryAction(fd: FormData): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  const raw = toObject(fd);
  const metaRaw = raw.meta;
  let meta: unknown = undefined;
  if (metaRaw && metaRaw.trim()) {
    try { meta = JSON.parse(metaRaw); } catch { return { ok: false, error: "El campo meta no es JSON válido." }; }
  }
  const parsed = entryCreateSchema.safeParse({ ...raw, meta });
  if (!parsed.success) return { ok: false, error: "Revisa los campos.", fieldErrors: fields(parsed.error) };
  const entry = await createEntry(parsed.data, u.userId);
  revalidateOs(parsed.data.area);
  return { ok: true, id: entry.id };
}

export async function updateEntryAction(fd: FormData): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  const raw = toObject(fd);
  const metaRaw = raw.meta;
  let meta: unknown = undefined;
  if (metaRaw !== undefined && metaRaw.trim() !== "") {
    try { meta = JSON.parse(metaRaw); } catch { return { ok: false, error: "El campo meta no es JSON válido." }; }
  }
  const parsed = entryUpdateSchema.safeParse({ ...raw, meta });
  if (!parsed.success) return { ok: false, error: "Revisa los campos.", fieldErrors: fields(parsed.error) };
  const entry = await updateEntry(parsed.data);
  revalidateOs(parsed.data.area);
  revalidatePath(`/os/${entry.area}/${entry.id}`);
  return { ok: true, id: entry.id };
}

export async function deleteEntryAction(id: string, area: string): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  await softDeleteEntry(id);
  revalidateOs(area);
  return { ok: true };
}

export async function toggleFavoriteAction(entryId: string): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  await toggleFavorite(entryId, u.userId);
  revalidatePath("/os");
  revalidatePath("/os/favoritos");
  return { ok: true };
}

export async function addRelationAction(fd: FormData): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  const parsed = relationCreateSchema.safeParse(toObject(fd));
  if (!parsed.success) return { ok: false, error: "Revisa la relación.", fieldErrors: fields(parsed.error) };
  try {
    await addRelation(parsed.data.fromId, parsed.data.toId, parsed.data.type, parsed.data.note);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la relación." };
  }
  revalidatePath("/os");
  return { ok: true };
}

export async function removeRelationAction(id: string): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  await removeRelation(id);
  revalidatePath("/os");
  return { ok: true };
}
