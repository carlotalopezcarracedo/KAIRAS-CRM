/**
 * Import del export JSON de KAIRAS OS en la BD apuntada por DATABASE_URL.
 * Pensado para migrar de la BD local a Supabase/Neon.
 *
 * Uso:  npx tsx scripts/import-data.ts backups/kairas-export-YYYY-MM-DD.json
 *
 * Seguridad: si la BD destino ya tiene datos de negocio (leads o clientes),
 * aborta salvo que se ejecute con FORCE_IMPORT=1. Los inserts usan
 * skipDuplicates: reimportar no duplica (mismos IDs).
 */
import { readFile } from "node:fs/promises";
import { prisma } from "@/server/db/prisma";

type ExportPayload = {
  format: string;
  version: number;
  data: Record<string, Record<string, unknown>[]>;
  relations?: {
    clientContacts?: { clientId: string; personIds: string[] }[];
  };
};

// Orden respetando claves foráneas
const IMPORT_ORDER = [
  "users",
  "companies",
  "people",
  "services",
  "tags",
  "campaigns",
  "clients",
  "leads",
  "opportunities",
  "proposals",
  "projects",
  "tasks",
  "hourlyRates",
  "recurringServices",
  "invoiceRecords",
  "invoiceDraftRequests",
  "timeEntries",
  "timerSessions",
  "calendarEvents",
  "interactions",
  "notes",
  "expenseRecords",
  "metaEventLogs",
  "odooSyncJobs",
  "attachments",
  "settings",
  "auditLogs",
] as const;

const MODEL_MAP: Record<(typeof IMPORT_ORDER)[number], string> = {
  users: "user",
  companies: "company",
  people: "person",
  services: "service",
  tags: "tag",
  campaigns: "campaign",
  clients: "client",
  leads: "lead",
  opportunities: "opportunity",
  proposals: "proposal",
  projects: "project",
  tasks: "task",
  hourlyRates: "hourlyRate",
  recurringServices: "recurringService",
  invoiceRecords: "invoiceRecord",
  invoiceDraftRequests: "invoiceDraftRequest",
  timeEntries: "timeEntry",
  timerSessions: "timerSession",
  calendarEvents: "calendarEvent",
  interactions: "interaction",
  notes: "note",
  expenseRecords: "expenseRecord",
  metaEventLogs: "metaEventLog",
  odooSyncJobs: "odooSyncJob",
  attachments: "attachment",
  settings: "settings",
  auditLogs: "auditLog",
};

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: npx tsx scripts/import-data.ts <export.json>");
    process.exit(1);
  }

  const payload = JSON.parse(await readFile(file, "utf8")) as ExportPayload;
  if (payload.format !== "kairas-os-export") {
    throw new Error("El archivo no es un export de KAIRAS OS.");
  }

  // Freno de seguridad
  const [existingLeads, existingClients] = await Promise.all([
    prisma.lead.count(),
    prisma.client.count(),
  ]);
  if ((existingLeads > 0 || existingClients > 0) && process.env.FORCE_IMPORT !== "1") {
    console.error(
      `ABORTADO: la BD destino ya tiene datos (${existingLeads} leads, ${existingClients} clientes).\n` +
        "Si de verdad quieres importar encima, ejecuta con FORCE_IMPORT=1.",
    );
    process.exit(1);
  }

  console.log("Importando en la BD destino…\n");
  for (const table of IMPORT_ORDER) {
    const rows = payload.data[table] ?? [];
    if (rows.length === 0) continue;
    const model = MODEL_MAP[table];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model];
    const result = await delegate.createMany({
      data: rows,
      skipDuplicates: true,
    });
    console.log(`  ${table}: ${result.count}/${rows.length} insertados`);
  }

  // Relaciones M-N: contactos de cliente
  const contactLinks = payload.relations?.clientContacts ?? [];
  for (const link of contactLinks) {
    await prisma.client
      .update({
        where: { id: link.clientId },
        data: { contacts: { connect: link.personIds.map((id) => ({ id })) } },
      })
      .catch(() => console.warn(`  ⚠ contactos de ${link.clientId}: omitidos`));
  }
  if (contactLinks.length > 0) {
    console.log(`  contactos de cliente reconectados: ${contactLinks.length}`);
  }

  console.log("\n✓ Import terminado. Verifica con: npx prisma studio");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
