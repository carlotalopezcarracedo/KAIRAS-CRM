// KAIRAS OS — servicio de conocimiento. Usa el prisma singleton del CRM.
// Solo tablas os_*; ninguna escritura sobre entidades del CRM.
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { getKnowledgeIndex } from "@/server/services/os/os-views-service";
import type { Prisma, OsStatus, OsEntryType } from "@prisma/client";
import type { EntryCreateInput, EntryUpdateInput } from "@/server/validators/os/knowledge";

export type ListParams = {
  area?: string;
  types?: OsEntryType[];
  type?: OsEntryType;
  status?: OsStatus;
  sector?: string;
  tag?: string;
  q?: string;
};

function toMetaInput(meta: unknown): Prisma.InputJsonValue | undefined {
  if (meta === undefined || meta === null) return undefined;
  return meta as Prisma.InputJsonValue;
}

export async function listEntries(params: ListParams) {
  const where: Prisma.KnowledgeEntryWhereInput = { deletedAt: null };
  if (params.area) where.area = params.area;
  if (params.type) where.type = params.type;
  else if (params.types && params.types.length) where.type = { in: params.types };
  if (params.status) where.status = params.status;
  if (params.sector) where.sector = params.sector;
  if (params.tag) where.tags = { some: { tag: { slug: params.tag } } };
  if (params.q) {
    const q = params.q;
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }
  return prisma.knowledgeEntry.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    include: { source: true, tags: { include: { tag: true } } },
  });
}

const getEntryUncached = async (id: string) => {
  const entry = await prisma.knowledgeEntry.findFirst({
    where: { id, deletedAt: null },
    include: {
      source: true,
      tags: { include: { tag: true } },
      versions: { orderBy: { version: "desc" } },
      relationsFrom: { include: { to: true } },
      relationsTo: { include: { from: true } },
    },
  });
  return entry;
};

/** Metadata y pagina piden la misma ficha; una sola consulta por render RSC. */
export const getEntry = cache(getEntryUncached);

export type EntryDetail = NonNullable<Awaited<ReturnType<typeof getEntry>>>;
export type EntryListItem = Awaited<ReturnType<typeof listEntries>>[number];

export async function createEntry(input: EntryCreateInput, actorId?: string) {
  const entry = await prisma.knowledgeEntry.create({
    data: {
      type: input.type,
      area: input.area,
      title: input.title,
      body: input.body ?? null,
      summary: input.summary ?? null,
      status: input.status,
      authority: input.authority,
      businessLine: input.businessLine,
      messageLayer: input.messageLayer,
      sector: input.sector ?? null,
      validUntil: input.validUntil ?? null,
      hypothesisRef: input.hypothesisRef ?? null,
      funnelStage: input.funnelStage ?? null,
      awarenessLevel: input.awarenessLevel ?? null,
      temperature: input.temperature ?? null,
      channel: input.channel ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      sourceId: input.sourceId ?? null,
      externalKey: input.externalKey ?? null,
      meta: toMetaInput(input.meta),
      ownerId: actorId ?? null,
    },
  });
  await snapshot(entry.id, "Creación", actorId);
  return entry;
}

export async function updateEntry(input: EntryUpdateInput, actorId?: string) {
  const { id, changeReason, ...rest } = input;
  const data: Prisma.KnowledgeEntryUpdateInput = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (k === "meta") data.meta = toMetaInput(v);
    else (data as Record<string, unknown>)[k] = v;
  }
  const updated = await prisma.knowledgeEntry.update({
    where: { id },
    data: { ...data, currentVersion: { increment: 1 } },
  });
  await snapshot(updated.id, changeReason ?? "Actualización", actorId);
  return updated;
}

/** Archiva una entrada (estado archivado) sin borrarla. Reversible. */
export async function archiveEntry(id: string, actorId?: string, reason?: string) {
  const updated = await prisma.knowledgeEntry.update({
    where: { id },
    data: { status: "archivado", currentVersion: { increment: 1 } },
  });
  await snapshot(updated.id, reason ?? "Archivada", actorId);
  return updated;
}

/** Guarda un snapshot de versión (historial inmutable). */
async function snapshot(entryId: string, reason: string, authorId?: string) {
  const e = await prisma.knowledgeEntry.findUnique({ where: { id: entryId } });
  if (!e) return;
  await prisma.knowledgeVersion.upsert({
    where: { entryId_version: { entryId, version: e.currentVersion } },
    update: {},
    create: {
      entryId,
      version: e.currentVersion,
      titleSnapshot: e.title,
      bodySnapshot: e.body,
      statusSnapshot: e.status,
      changeReason: reason,
      authorId: authorId ?? null,
    },
  });
}

export async function softDeleteEntry(id: string) {
  return prisma.knowledgeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
}

// -- Relaciones --------------------------------------------------------------
export async function addRelation(fromId: string, toId: string, type: Prisma.KnowledgeRelationCreateInput["type"], note?: string) {
  if (fromId === toId) throw new Error("No se puede relacionar una entrada consigo misma");
  return prisma.knowledgeRelation.upsert({
    where: { fromId_toId_type: { fromId, toId, type } },
    update: { note: note ?? null },
    create: { fromId, toId, type, note: note ?? null },
  });
}

export async function removeRelation(id: string) {
  return prisma.knowledgeRelation.delete({ where: { id } });
}

// -- Favoritos ---------------------------------------------------------------
export async function toggleFavorite(entryId: string, userId: string) {
  const existing = await prisma.knowledgeFavorite.findUnique({
    where: { entryId_userId: { entryId, userId } },
  });
  if (existing) {
    await prisma.knowledgeFavorite.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.knowledgeFavorite.create({ data: { entryId, userId } });
  return true;
}

export async function listFavorites(userId: string) {
  return prisma.knowledgeEntry.findMany({
    where: { deletedAt: null, favorites: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    include: { source: true, tags: { include: { tag: true } } },
  });
}

export async function isFavorite(entryId: string, userId: string) {
  const f = await prisma.knowledgeFavorite.findUnique({
    where: { entryId_userId: { entryId, userId } },
  });
  return !!f;
}

// -- Tags --------------------------------------------------------------------
export async function listTags() {
  return prisma.knowledgeTag.findMany({ orderBy: { name: "asc" } });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Sincroniza las etiquetas de una entrada a partir de nombres libres. Crea las que falten. */
export async function setEntryTags(entryId: string, names: string[]) {
  const clean = Array.from(
    new Map(
      names
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => [slugify(n), n] as const)
        .filter(([slug]) => slug.length > 0),
    ).entries(),
  ); // [slug, name][] sin duplicados

  const tagIds: string[] = [];
  for (const [slug, name] of clean) {
    const tag = await prisma.knowledgeTag.upsert({
      where: { slug },
      update: {},
      create: { slug, name },
    });
    tagIds.push(tag.id);
  }
  await prisma.knowledgeEntryTag.deleteMany({ where: { entryId } });
  if (tagIds.length) {
    await prisma.knowledgeEntryTag.createMany({
      data: tagIds.map((tagId) => ({ entryId, tagId })),
      skipDuplicates: true,
    });
  }
  return tagIds.length;
}

/**
 * Resuelve nombres de autor (userId -> nombre) con una LECTURA de User.
 * No añade relaciones ni modifica el esquema; solo consulta para mostrar autoría.
 */
export async function getUserNames(ids: (string | null | undefined)[]) {
  const uniq = [...new Set(ids.filter((v): v is string => !!v))];
  if (uniq.length === 0) return {} as Record<string, string>;
  const users = await prisma.user.findMany({
    where: { id: { in: uniq } },
    select: { id: true, name: true, email: true },
  });
  const map: Record<string, string> = {};
  for (const u of users) map[u.id] = u.name || u.email || u.id;
  return map;
}

// -- Opciones para el selector de relaciones ---------------------------------
export async function listEntryOptions(excludeId?: string) {
  const entries = await getKnowledgeIndex();
  return entries
    .filter((entry) => entry.id !== excludeId)
    .map(({ id, title, area, type }) => ({ id, title, area, type }))
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area, "es") || a.title.localeCompare(b.title, "es"),
    );
}

// -- Búsqueda global ---------------------------------------------------------
export async function searchEntries(q: string, filters: { type?: OsEntryType; status?: OsStatus } = {}) {
  if (!q || q.trim().length < 2) return [];
  const term = q.trim();
  return prisma.knowledgeEntry.findMany({
    where: {
      deletedAt: null,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
        { body: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ authority: "asc" }, { updatedAt: "desc" }],
    take: 50,
    include: { source: true },
  });
}

// -- Dashboard ---------------------------------------------------------------
export async function getDashboard(userId: string) {
  const [
    totalVigente,
    openHypotheses,
    activeExperiments,
    recentDecisions,
    openRisks,
    recentlyUpdated,
    favorites,
    byStatus,
  ] = await Promise.all([
    prisma.knowledgeEntry.count({ where: { deletedAt: null, status: "vigente" } }),
    prisma.knowledgeEntry.findMany({
      where: { deletedAt: null, type: "hipotesis", status: { in: ["provisional", "condicionado", "borrador"] } },
      orderBy: { updatedAt: "desc" }, take: 6,
    }),
    prisma.knowledgeEntry.count({ where: { deletedAt: null, type: "experimento", status: { in: ["provisional", "condicionado"] } } }),
    prisma.knowledgeEntry.findMany({
      where: { deletedAt: null, type: "decision" }, orderBy: { updatedAt: "desc" }, take: 5,
    }),
    prisma.knowledgeEntry.findMany({
      where: { deletedAt: null, type: "riesgo" }, orderBy: { updatedAt: "desc" }, take: 5,
    }),
    prisma.knowledgeEntry.findMany({
      where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 8,
      include: { source: true },
    }),
    listFavorites(userId),
    prisma.knowledgeEntry.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
  ]);
  return {
    totalVigente,
    openHypotheses,
    activeExperiments,
    recentDecisions,
    openRisks,
    recentlyUpdated,
    favorites: favorites.slice(0, 6),
    byStatus,
  };
}

export async function countByArea() {
  const rows = await prisma.knowledgeEntry.groupBy({
    by: ["area"], where: { deletedAt: null }, _count: true,
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.area, r._count);
  return map;
}
