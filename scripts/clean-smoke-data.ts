/**
 * Limpia datos de prueba con prefijo "SMOKE" que hayan quedado huérfanos
 * si un smoke test se interrumpe a medias (p. ej. caída de la BD local).
 * Ejecutar: npx tsx scripts/clean-smoke-data.ts
 */
import { prisma } from "@/server/db/prisma";

async function main() {
  const leads = await prisma.lead.findMany({
    where: { name: { startsWith: "SMOKE" } },
    select: { id: true, clientId: true },
  });
  const clients = await prisma.client.findMany({
    where: { name: { startsWith: "SMOKE" } },
    select: { id: true },
  });
  const clientIds = [
    ...new Set([
      ...clients.map((c) => c.id),
      ...leads.map((l) => l.clientId).filter((id): id is string => !!id),
    ]),
  ];
  const leadIds = leads.map((l) => l.id);

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ name: { startsWith: "SMOKE" } }, { clientId: { in: clientIds } }],
    },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  // Orden de borrado respetando relaciones
  await prisma.metaEventLog.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.timerSession.deleteMany({
    where: { OR: [{ clientId: { in: clientIds } }, { projectId: { in: projectIds } }] },
  });
  await prisma.timeEntry.deleteMany({
    where: { OR: [{ clientId: { in: clientIds } }, { projectId: { in: projectIds } }] },
  });
  await prisma.invoiceDraftRequest.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.invoiceRecord.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.task.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "SMOKE" } },
        { projectId: { in: projectIds } },
        { clientId: { in: clientIds } },
      ],
    },
  });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.interaction.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.note.deleteMany({
    where: { OR: [{ leadId: { in: leadIds } }, { clientId: { in: clientIds } }] },
  });
  await prisma.opportunity.deleteMany({
    where: {
      OR: [
        { title: { startsWith: "SMOKE" } },
        { leadId: { in: leadIds } },
        { clientId: { in: clientIds } },
      ],
    },
  });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });

  console.log(
    `Limpieza SMOKE: ${leadIds.length} leads, ${clientIds.length} clientes, ${projectIds.length} proyectos eliminados con sus datos asociados.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
