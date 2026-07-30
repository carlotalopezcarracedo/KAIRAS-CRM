/**
 * Auditoría de solo lectura para el corpus de KAIRAS OS.
 * Falla ante problemas de identidad, trazabilidad, versión o clasificación.
 */
import { prisma } from "@/server/db/prisma";

const knownAreas = new Set([
  "identidad",
  "marca",
  "comunicacion",
  "oferta",
  "comercial",
  "clientes",
  "contenidos",
  "validacion",
  "playbooks",
  "recursos",
  "constitucion",
]);

function normalizedTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

async function main() {
  const [entries, versions, relations] = await Promise.all([
    prisma.knowledgeEntry.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        externalKey: true,
        title: true,
        summary: true,
        body: true,
        area: true,
        status: true,
        sourceId: true,
        currentVersion: true,
      },
    }),
    prisma.knowledgeVersion.findMany({ select: { entryId: true, version: true } }),
    prisma.knowledgeRelation.findMany({ select: { fromId: true, toId: true } }),
  ]);

  const versionKeys = new Set(versions.map((version) => `${version.entryId}:${version.version}`));
  const blockers: string[] = [];
  const warnings: string[] = [];
  const titleGroups = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.externalKey) blockers.push(`${entry.id}: sin externalKey`);
    if (!entry.sourceId) blockers.push(`${entry.externalKey ?? entry.id}: sin fuente`);
    if (!knownAreas.has(entry.area)) blockers.push(`${entry.externalKey ?? entry.id}: área desconocida "${entry.area}"`);
    if (!versionKeys.has(`${entry.id}:${entry.currentVersion}`)) {
      blockers.push(`${entry.externalKey ?? entry.id}: falta snapshot v${entry.currentVersion}`);
    }
    if (!entry.summary) warnings.push(`${entry.externalKey ?? entry.id}: sin resumen`);
    if (!entry.body) warnings.push(`${entry.externalKey ?? entry.id}: sin cuerpo`);

    const key = normalizedTitle(entry.title);
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), entry.externalKey ?? entry.id]);
  }

  for (const relation of relations) {
    if (relation.fromId === relation.toId) blockers.push(`relación reflexiva en ${relation.fromId}`);
  }

  const repeatedTitles = [...titleGroups.entries()].filter(([, ids]) => ids.length > 1);
  for (const [title, ids] of repeatedTitles) {
    warnings.push(`título repetido "${title}": ${ids.join(", ")}`);
  }

  const byStatus = Object.entries(
    entries.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.status] = (counts[entry.status] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([status, count]) => `${status}=${count}`)
    .join(" · ");

  console.log(`Entradas activas: ${entries.length}`);
  console.log(`Versiones: ${versions.length} · Relaciones: ${relations.length}`);
  console.log(`Estados: ${byStatus}`);
  console.log(`Avisos no bloqueantes: ${warnings.length}`);
  for (const warning of warnings) console.log(`  ⚠ ${warning}`);

  if (blockers.length > 0) {
    console.error(`Bloqueos: ${blockers.length}`);
    for (const blocker of blockers) console.error(`  ✗ ${blocker}`);
    process.exitCode = 1;
  } else {
    console.log("✅ Identidad, clasificación, trazabilidad y snapshots verificados.");
  }
}

main()
  .catch((error) => {
    console.error("No se pudo verificar KAIRAS OS:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

