import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { TogglClient } from "@/integrations/toggl/adapter";
import { getTogglSettings } from "@/server/services/toggl-connection-service";

/**
 * Mapeo Toggl Project ID <-> Kairas Project ID. El nombre solo se usa una
 * vez, para sugerir; a partir de ahí todo se resuelve por ID (ver
 * `TogglProjectMapping` en el schema).
 */

// Mismo criterio de normalización que `toll-import-service.ts` (tildes y
// mayúsculas no deben impedir una coincidencia).
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
function normalize(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

export type ProjectMappingRow = {
  id: string;
  togglProjectId: string;
  togglProjectName: string;
  kairasProjectId: string | null;
  kairasProjectName: string | null;
  matchedByName: boolean;
  confirmed: boolean;
};

/**
 * Trae los proyectos del workspace de Toggl y crea la fila de mapping que
 * falte. Sugiere por nombre SOLO si hay una coincidencia única y no
 * ambigua; nunca confirma sola. Las filas ya confirmadas no se tocan.
 */
export async function refreshProjectMappings(
  actorId: string,
): Promise<{ created: number; total: number }> {
  const settings = await getTogglSettings();
  if (!settings.workspaceId) throw new Error("NO_WORKSPACE");

  const client = new TogglClient();
  const togglProjects = await client.getProjects(settings.workspaceId);

  const [existingMappings, kairasProjects] = await Promise.all([
    prisma.togglProjectMapping.findMany({ select: { id: true, togglProjectId: true, togglProjectName: true } }),
    prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);
  const existingByTogglId = new Map(existingMappings.map((m) => [m.togglProjectId, m]));

  let created = 0;
  for (const tp of togglProjects) {
    const togglId = String(tp.id);
    const existing = existingByTogglId.get(togglId);
    if (existing) {
      // Solo refresca el nombre en caché; nunca toca kairasProjectId/confirmedAt.
      if (existing.togglProjectName !== tp.name) {
        await prisma.togglProjectMapping.update({
          where: { id: existing.id },
          data: { togglProjectName: tp.name },
        });
      }
      continue;
    }

    const matches = kairasProjects.filter((p) => normalize(p.name) === normalize(tp.name));
    const suggestion = matches.length === 1 ? matches[0] : null;

    await prisma.togglProjectMapping.create({
      data: {
        togglProjectId: togglId,
        togglProjectName: tp.name,
        togglWorkspaceId: String(tp.workspaceId),
        kairasProjectId: suggestion?.id ?? null,
        matchedByName: !!suggestion,
      },
    });
    created += 1;
  }

  await audit({
    actorId,
    action: "sync",
    entityType: "TogglProjectMapping",
    metadata: { refreshed: togglProjects.length, created },
  });

  return { created, total: togglProjects.length };
}

export async function listProjectMappings(): Promise<ProjectMappingRow[]> {
  const mappings = await prisma.togglProjectMapping.findMany({
    orderBy: [{ confirmedAt: "asc" }, { togglProjectName: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  return mappings.map((m) => ({
    id: m.id,
    togglProjectId: m.togglProjectId,
    togglProjectName: m.togglProjectName,
    kairasProjectId: m.kairasProjectId,
    kairasProjectName: m.project?.name ?? null,
    matchedByName: m.matchedByName,
    confirmed: !!m.confirmedAt,
  }));
}

/**
 * Confirma un mapping (o su ausencia deliberada, con kairasProjectId=null
 * = "no corresponde a ningún proyecto Kairas") y reasigna automáticamente
 * las TimeEntry "Sin asignar" que ya tenían guardado este togglProjectId.
 */
export async function confirmProjectMapping(
  actorId: string,
  mappingId: string,
  kairasProjectId: string | null,
): Promise<{ reassigned: number }> {
  const mapping = await prisma.togglProjectMapping.findUnique({ where: { id: mappingId } });
  if (!mapping) throw new Error("NOT_FOUND");

  let projectClientId: string | null = null;
  if (kairasProjectId) {
    const project = await prisma.project.findFirst({
      where: { id: kairasProjectId, deletedAt: null },
      select: { clientId: true },
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    projectClientId = project.clientId;
  }

  await prisma.togglProjectMapping.update({
    where: { id: mappingId },
    data: { kairasProjectId, confirmedAt: new Date() },
  });

  let reassigned = 0;
  if (kairasProjectId) {
    const result = await prisma.timeEntry.updateMany({
      where: { togglProjectId: mapping.togglProjectId, projectId: null, deletedAt: null },
      data: { projectId: kairasProjectId, clientId: projectClientId },
    });
    reassigned = result.count;
  }

  await audit({
    actorId,
    action: "update",
    entityType: "TogglProjectMapping",
    entityId: mappingId,
    after: { kairasProjectId, reassigned },
  });

  return { reassigned };
}

/** Cuántas TimeEntry importadas siguen sin proyecto asignado. */
export async function countUnassignedEntries(): Promise<number> {
  return prisma.timeEntry.count({
    where: { projectId: null, togglProjectId: { not: null }, deletedAt: null },
  });
}

export type ImportedEntriesSummary = {
  /** Total de TimeEntry con origen Toggl (importadas o llegadas por sync), sin contar borradas. */
  total: number;
  assigned: number;
  unassigned: number;
  /** Nº de togglProjectId distintos presentes en esas entradas (con o sin mapping todavía). */
  distinctTogglProjects: number;
  earliestStartedAt: Date | null;
  latestStartedAt: Date | null;
};

/**
 * Resumen administrativo de lo que ya ha llegado de Toggl (histórico +
 * reconciliaciones), para ver de un vistazo el alcance sin tener que abrir
 * cada entrada. No expone nada sensible: solo conteos y un rango de fechas.
 */
export async function getImportedEntriesSummary(): Promise<ImportedEntriesSummary> {
  const where = { origin: "toggl" as const, deletedAt: null };
  const [total, assigned, distinctProjects, range] = await Promise.all([
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.count({ where: { ...where, projectId: { not: null } } }),
    prisma.timeEntry.findMany({
      where: { ...where, togglProjectId: { not: null } },
      distinct: ["togglProjectId"],
      select: { togglProjectId: true },
    }),
    prisma.timeEntry.aggregate({
      where,
      _min: { startedAt: true },
      _max: { startedAt: true },
    }),
  ]);

  return {
    total,
    assigned,
    unassigned: total - assigned,
    distinctTogglProjects: distinctProjects.length,
    earliestStartedAt: range._min.startedAt,
    latestStartedAt: range._max.startedAt,
  };
}
