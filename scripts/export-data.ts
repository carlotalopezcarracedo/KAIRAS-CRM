/**
 * Export completo de datos a JSON (backup manual / migración entre BDs).
 * No depende de pg_dump: funciona en cualquier máquina con Node.
 *
 * Uso:   npx tsx scripts/export-data.ts [ruta-salida.json]
 * Salida por defecto: backups/kairas-export-YYYY-MM-DD.json
 *
 * Limitación conocida: las relaciones M-N sin UI todavía (etiquetas,
 * servicios secundarios de proyecto, servicios de propuesta) no se exportan.
 * Los contactos de cliente SÍ se exportan y restauran.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";

async function main() {
  const outArg = process.argv[2];
  const fileName =
    outArg ??
    path.join("backups", `kairas-export-${new Date().toISOString().slice(0, 10)}.json`);

  const [
    users,
    companies,
    people,
    services,
    tags,
    campaigns,
    clients,
    leads,
    opportunities,
    proposals,
    projects,
    tasks,
    hourlyRates,
    recurringServices,
    invoiceRecords,
    invoiceDraftRequests,
    timeEntries,
    timerSessions,
    calendarEvents,
    interactions,
    notes,
    expenseRecords,
    metaEventLogs,
    odooSyncJobs,
    attachments,
    settings,
    auditLogs,
    clientContacts,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.company.findMany(),
    prisma.person.findMany(),
    prisma.service.findMany(),
    prisma.tag.findMany(),
    prisma.campaign.findMany(),
    prisma.client.findMany(),
    prisma.lead.findMany(),
    prisma.opportunity.findMany(),
    prisma.proposal.findMany(),
    prisma.project.findMany(),
    prisma.task.findMany(),
    prisma.hourlyRate.findMany(),
    prisma.recurringService.findMany(),
    prisma.invoiceRecord.findMany(),
    prisma.invoiceDraftRequest.findMany(),
    prisma.timeEntry.findMany(),
    prisma.timerSession.findMany(),
    prisma.calendarEvent.findMany(),
    prisma.interaction.findMany(),
    prisma.note.findMany(),
    prisma.expenseRecord.findMany(),
    prisma.metaEventLog.findMany(),
    prisma.odooSyncJob.findMany(),
    prisma.attachment.findMany(),
    prisma.settings.findMany(),
    prisma.auditLog.findMany(),
    prisma.client.findMany({
      select: { id: true, contacts: { select: { id: true } } },
    }),
  ]);

  const payload = {
    format: "kairas-os-export",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      users,
      companies,
      people,
      services,
      tags,
      campaigns,
      clients,
      leads,
      opportunities,
      proposals,
      projects,
      tasks,
      hourlyRates,
      recurringServices,
      invoiceRecords,
      invoiceDraftRequests,
      timeEntries,
      timerSessions,
      calendarEvents,
      interactions,
      notes,
      expenseRecords,
      metaEventLogs,
      odooSyncJobs,
      attachments,
      settings,
      auditLogs,
    },
    relations: {
      clientContacts: clientContacts
        .filter((c) => c.contacts.length > 0)
        .map((c) => ({ clientId: c.id, personIds: c.contacts.map((p) => p.id) })),
    },
  };

  await mkdir(path.dirname(path.resolve(fileName)), { recursive: true });
  await writeFile(fileName, JSON.stringify(payload, null, 1), "utf8");

  const counts = Object.entries(payload.data)
    .map(([table, rows]) => `${table}: ${(rows as unknown[]).length}`)
    .join(", ");
  console.log(`✓ Export completo → ${fileName}`);
  console.log(`  ${counts}`);
  console.log(
    "\n⚠ Los archivos adjuntos (binarios) NO van en este export: viven en el storage (local .uploads/ o Supabase). Copia .uploads/ aparte si usas driver local.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
