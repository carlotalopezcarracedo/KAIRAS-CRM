// KAIRAS OS — servicio de vistas, actividad y agregados por sección (rediseño).
// Solo tablas os_*. Aditivo: no toca el servicio de conocimiento existente.
import { prisma } from "@/server/db/prisma";
import type { Prisma, OsEntryType } from "@prisma/client";

// -- Registro de uso ---------------------------------------------------------
export async function recordView(entryId: string, userId?: string) {
  try {
    await prisma.knowledgeView.create({ data: { entryId, userId: userId ?? null } });
  } catch {
    /* el registro de uso nunca debe romper la navegación */
  }
}

/** Entradas más consultadas (por nº de vistas). Fallback: favoritas/recientes. */
export async function getMostUsed(limit = 6) {
  const grouped = await prisma.knowledgeView.groupBy({
    by: ["entryId"],
    _count: { entryId: true },
    orderBy: { _count: { entryId: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.entryId);
  if (ids.length === 0) {
    return prisma.knowledgeEntry.findMany({
      where: { deletedAt: null, status: { notIn: ["historico", "obsoleto", "archivado"] } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: baseSelect,
    });
  }
  const entries = await prisma.knowledgeEntry.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: baseSelect,
  });
  const counts = new Map(grouped.map((g) => [g.entryId, g._count.entryId]));
  return entries
    .map((e) => ({ ...e, views: counts.get(e.id) ?? 0 }))
    .sort((a, b) => b.views - a.views);
}

/** Actividad de la última semana: total de vistas + entradas de recursos vistas. */
export async function getWeeklyActivity() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalViews, resourceViews] = await Promise.all([
    prisma.knowledgeView.count({ where: { viewedAt: { gte: since } } }),
    prisma.knowledgeView.findMany({
      where: { viewedAt: { gte: since }, entry: { area: "recursos", deletedAt: null } },
      distinct: ["entryId"],
      orderBy: { viewedAt: "desc" },
      take: 6,
      select: { entry: { select: baseSelect } },
    }),
  ]);
  return { totalViews, resources: resourceViews.map((v) => v.entry) };
}

/** Feed de actividad: últimas versiones creadas (ediciones/altas). */
export async function getActivityFeed(limit = 8) {
  const versions = await prisma.knowledgeVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { entry: { select: baseSelect } },
  });
  return versions
    .filter((v) => v.entry && v.entry.deletedAt === null)
    .map((v) => ({
      id: v.id,
      version: v.version,
      changeReason: v.changeReason,
      createdAt: v.createdAt,
      entry: v.entry,
    }));
}

// -- Secciones ---------------------------------------------------------------
type SectionQuery = { areas?: string[]; types?: OsEntryType[] };

function sectionWhere(q: SectionQuery, extra?: Prisma.KnowledgeEntryWhereInput): Prisma.KnowledgeEntryWhereInput {
  const or: Prisma.KnowledgeEntryWhereInput[] = [];
  if (q.areas?.length) or.push({ area: { in: q.areas } });
  if (q.types?.length) or.push({ type: { in: q.types } });
  return { deletedAt: null, ...(or.length ? { OR: or } : {}), ...extra };
}

export async function getSectionEntries(q: SectionQuery, opts: { includeHistoric?: boolean } = {}) {
  const extra: Prisma.KnowledgeEntryWhereInput = opts.includeHistoric ? {} : { status: { notIn: ["obsoleto"] } };
  return prisma.knowledgeEntry.findMany({
    where: sectionWhere(q, extra),
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { source: true, tags: { include: { tag: true } } },
  });
}

export type SectionEntry = Awaited<ReturnType<typeof getSectionEntries>>[number];

export async function countSection(q: SectionQuery) {
  return prisma.knowledgeEntry.count({ where: sectionWhere(q) });
}

/** Conteos por área y por tipo en 2 consultas, para el sidebar. */
export async function getSectionCounts() {
  const [byArea, byType] = await Promise.all([
    prisma.knowledgeEntry.groupBy({ by: ["area"], _count: true, where: { deletedAt: null } }),
    prisma.knowledgeEntry.groupBy({ by: ["type"], _count: true, where: { deletedAt: null } }),
  ]);
  const areaMap = new Map(byArea.map((r) => [r.area, r._count]));
  const typeMap = new Map(byType.map((r) => [r.type, r._count]));
  return { areaMap, typeMap };
}

// -- Métricas del dashboard --------------------------------------------------
export async function dashboardStats() {
  const [total, vigentes, hypotheses, relations] = await Promise.all([
    prisma.knowledgeEntry.count({ where: { deletedAt: null } }),
    prisma.knowledgeEntry.count({ where: { deletedAt: null, status: "vigente" } }),
    prisma.knowledgeEntry.count({
      where: { deletedAt: null, type: "hipotesis", status: { in: ["provisional", "condicionado", "borrador"] } },
    }),
    prisma.knowledgeRelation.count(),
  ]);
  return { total, vigentes, hypotheses, relations };
}

// -- Búsqueda instantánea (Spotlight) ----------------------------------------
export async function quickSearch(q: string, take = 8) {
  const term = q.trim();
  if (term.length < 2) return [];
  return prisma.knowledgeEntry.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
        { body: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: [{ authority: "asc" }, { updatedAt: "desc" }],
    take,
    select: baseSelect,
  });
}

// -- Selección base ligera ---------------------------------------------------
const baseSelect = {
  id: true, externalKey: true, title: true, summary: true, area: true,
  type: true, status: true, authority: true, sector: true, updatedAt: true, deletedAt: true,
} satisfies Prisma.KnowledgeEntrySelect;

export type BaseEntry = Prisma.KnowledgeEntryGetPayload<{ select: typeof baseSelect }>;
