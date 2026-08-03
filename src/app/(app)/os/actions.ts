"use server";

import { revalidatePath, updateTag } from "next/cache";
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
  archiveEntry,
  softDeleteEntry,
  addRelation,
  removeRelation,
  toggleFavorite,
  setEntryTags,
  listEntryOptions,
} from "@/server/services/os/knowledge-service";
import {
  OS_KNOWLEDGE_CACHE_TAG,
  quickSearch,
  recordView,
  type BaseEntry,
} from "@/server/services/os/os-views-service";

/** Búsqueda instantánea para el Spotlight (⌘K). */
export async function quickSearchAction(q: string): Promise<BaseEntry[]> {
  const u = await withUser();
  if (!u.ok) return [];
  return quickSearch(q);
}

/** Registra un acceso a una entrada (best-effort, para "más utilizado"/actividad). */
export async function recordViewAction(entryId: string): Promise<void> {
  const u = await withUser();
  await recordView(entryId, u.ok ? u.userId : undefined);
}

/** El selector de relaciones se carga solo cuando la usuaria decide abrirlo. */
export async function getEntryOptionsAction(excludeId: string) {
  const u = await withUser();
  if (!u.ok) return [];
  return listEntryOptions(excludeId);
}

/** "a, b , c" -> ["a","b","c"] */
function parseTags(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

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
  updateTag(OS_KNOWLEDGE_CACHE_TAG);
  revalidatePath("/os");
  if (area) revalidatePath(`/os/${area}`);
}

function toObject(fd: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export async function createEntryAction(
  _prev: ActionResult | undefined,
  fd: FormData,
): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  const raw = toObject(fd);
  const metaRaw = raw.meta;
  let meta: unknown = undefined;
  if (metaRaw && metaRaw.trim()) {
    try { meta = JSON.parse(metaRaw); } catch { return { ok: false, error: "El campo «meta» no es JSON válido." }; }
  }
  const parsed = entryCreateSchema.safeParse({ ...raw, meta });
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: fields(parsed.error) };
  const entry = await createEntry(parsed.data, u.userId);
  await setEntryTags(entry.id, parseTags(raw.tags));
  revalidateOs(parsed.data.area);
  return { ok: true, id: entry.id };
}

export async function updateEntryAction(
  _prev: ActionResult | undefined,
  fd: FormData,
): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  const raw = toObject(fd);
  const metaRaw = raw.meta;
  let meta: unknown = undefined;
  if (metaRaw !== undefined && metaRaw.trim() !== "") {
    try { meta = JSON.parse(metaRaw); } catch { return { ok: false, error: "El campo «meta» no es JSON válido." }; }
  }
  const parsed = entryUpdateSchema.safeParse({ ...raw, meta });
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: fields(parsed.error) };
  const entry = await updateEntry(parsed.data, u.userId);
  if (raw.tags !== undefined) await setEntryTags(entry.id, parseTags(raw.tags));
  revalidateOs(parsed.data.area ?? entry.area);
  revalidatePath(`/os/${entry.area}/${entry.id}`);
  return { ok: true, id: entry.id };
}

/** Archiva (no borra) una entrada. No hay borrado destructivo desde la interfaz. */
export async function archiveEntryAction(
  id: string,
  area: string,
  reason?: string,
): Promise<ActionResult> {
  const u = await withUser();
  if (!u.ok) return { ok: false, error: u.error };
  await archiveEntry(id, u.userId, reason);
  revalidateOs(area);
  revalidatePath(`/os/${area}/${id}`);
  return { ok: true, id };
}

/**
 * Borrado suave (reversible; NO expuesto en la interfaz V1). Se mantiene solo
 * para pruebas y administración futura. La UI únicamente ofrece «Archivar».
 */
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
