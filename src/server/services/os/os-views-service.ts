// KAIRAS OS — servicio de vistas, actividad y agregados por sección (rediseño).
// Solo tablas os_*. Aditivo: no toca el servicio de conocimiento existente.
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import type { Prisma, OsEntryType } from "@prisma/client";

// -- Índice ligero -----------------------------------------------------------
// Una única lectura pequeña alimenta navegación, dashboard y clasificaciones.
// Nunca incluye body, versiones, relaciones ni documentos completos.
const indexSelect = {
  id: true,
  externalKey: true,
  title: true,
  summary: true,
  area: true,
  type: true,
  status: true,
  authority: true,
  businessLine: true,
  messageLayer: true,
  sector: true,
  validUntil: true,
  funnelStage: true,
  awarenessLevel: true,
  temperature: true,
  channel: true,
  updatedAt: true,
} satisfies Prisma.KnowledgeEntrySelect;

export type KnowledgeIndexEntry = Prisma.KnowledgeEntryGetPayload<{
  select: typeof indexSelect;
}>;

/**
 * `cache` deduplica la lectura cuando layout y página la piden en el mismo
 * render RSC. El resultado no se persiste entre peticiones ni entre usuarios.
 */
export const getKnowledgeIndex = cache(async (): Promise<KnowledgeIndexEntry[]> => {
  return prisma.knowledgeEntry.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: indexSelect,
  });
});

type ViewSample = { entryId: string; viewedAt: Date };

function latestDistinctViews(views: ViewSample[], limit: number) {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const view of views) {
    if (seen.has(view.entryId)) continue;
    seen.add(view.entryId);
    ids.push(view.entryId);
    if (ids.length === limit) break;
  }
  return ids;
}

function mostViewedIds(views: ViewSample[], limit: number) {
  const counts = new Map<string, number>();
  for (const view of views) counts.set(view.entryId, (counts.get(view.entryId) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export type OsDashboardOverview = Awaited<ReturnType<typeof getOsDashboardOverview>>;

/**
 * Dashboard operativo en tres round-trips como máximo:
 * índice + favoritos + muestra de vistas. Los dos últimos son secundarios y
 * degradan de forma explícita sin tumbar la pantalla.
 */
export async function getOsDashboardOverview(userId: string) {
  const indexPromise = getKnowledgeIndex();
  const secondary = await Promise.allSettled([
    prisma.knowledgeFavorite.findMany({
      where: { userId },
      select: { entryId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.knowledgeView.findMany({
      select: { entryId: true, viewedAt: true },
      orderBy: { viewedAt: "desc" },
      take: 200,
    }),
  ]);
  const entries = await indexPromise;

  if (secondary[0].status === "rejected") {
    console.error("[KAIRAS_OS_PARTIAL] favorites_unavailable");
  }
  if (secondary[1].status === "rejected") {
    console.error("[KAIRAS_OS_PARTIAL] views_unavailable");
  }

  const favoriteIds =
    secondary[0].status === "fulfilled"
      ? new Set(secondary[0].value.map((favorite) => favorite.entryId))
      : new Set<string>();
  const views = secondary[1].status === "fulfilled" ? secondary[1].value : [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const operational = entries.filter(
    (entry) => !["historico", "obsoleto", "archivado"].includes(entry.status),
  );
  const attention = operational.filter((entry) => {
    if (entry.validUntil && entry.validUntil.getTime() < now) return true;
    return (
      ["provisional", "condicionado"].includes(entry.status) &&
      entry.updatedAt.getTime() < ninetyDaysAgo
    );
  });
  const recentViewIds = latestDistinctViews(views, 6);
  const mostUsed = mostViewedIds(views, 6)
    .map(([id, count]) => {
      const entry = byId.get(id);
      return entry ? { ...entry, views: count } : null;
    })
    .filter((entry): entry is KnowledgeIndexEntry & { views: number } => entry !== null);

  return {
    stats: {
      total: entries.length,
      vigentes: entries.filter((entry) => entry.status === "vigente").length,
      hypotheses: entries.filter(
        (entry) =>
          entry.type === "hipotesis" &&
          ["provisional", "condicionado", "borrador"].includes(entry.status),
      ).length,
      attention: attention.length,
    },
    decisions: entries.filter((entry) => entry.type === "decision").slice(0, 5),
    hypotheses: entries
      .filter(
        (entry) =>
          entry.type === "hipotesis" &&
          ["provisional", "condicionado", "borrador"].includes(entry.status),
      )
      .slice(0, 5),
    updates: entries.slice(0, 6),
    favorites: entries.filter((entry) => favoriteIds.has(entry.id)).slice(0, 6),
    recentlyViewed: recentViewIds
      .map((id) => byId.get(id))
      .filter((entry): entry is KnowledgeIndexEntry => Boolean(entry)),
    mostUsed:
      mostUsed.length > 0
        ? mostUsed
        : operational.slice(0, 6).map((entry) => ({ ...entry, views: 0 })),
    playbooks: operational.filter((entry) => entry.type === "playbook").slice(0, 5),
    clients: operational.filter((entry) => entry.area === "clientes").slice(0, 4),
    attention: attention.slice(0, 5),
    upcoming: operational
      .filter((entry) => entry.validUntil && entry.validUntil.getTime() >= now)
      .sort(
        (a, b) =>
          (a.validUntil?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.validUntil?.getTime() ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 5),
  };
}

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
  const entries = await getKnowledgeIndex();
  const areaMap = new Map<string, number>();
  const typeMap = new Map<OsEntryType, number>();
  for (const entry of entries) {
    areaMap.set(entry.area, (areaMap.get(entry.area) ?? 0) + 1);
    typeMap.set(entry.type, (typeMap.get(entry.type) ?? 0) + 1);
  }
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
