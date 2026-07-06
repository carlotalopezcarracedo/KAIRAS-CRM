/**
 * Import puntual del Excel de prospección al CRM (tabla Lead).
 * - Dedupe por nombre normalizado contra leads Y clientes existentes.
 * - No dispara eventos Meta (import histórico) pero sí deja audit log.
 * - Idempotente: re-ejecutar no duplica.
 *
 * Uso (producción):
 *   npx dotenv -e .env.supabase -- npx tsx scripts/import-xlsx-leads.ts <ruta.xlsx>
 */
import * as XLSX from "xlsx";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { parseMadridLocal } from "@/lib/dates";
import type { LeadStatus, Temperature, Prisma } from "@prisma/client";

type Row = {
  Nombre: string;
  Propietario: string;
  Fase: string;
  Estado: string;
  "último contacto": string;
  "Valor estimado": string;
  Probabilidad: string;
  Notas: string;
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** ALL CAPS → Tipo Título (respetando conectores en minúscula). */
function titleCase(value: string): string {
  const small = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "a", "en"]);
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** "6/07/2026" (D/M/YYYY) → Date a mediodía Madrid. */
function parseSpanishDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = parseMadridLocal(
    `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapStatus(fase: string, estado: string): {
  status: LeadStatus;
  temperature: Temperature;
} {
  const f = fase.trim().toLowerCase();
  const e = estado.trim().toLowerCase();

  if (e === "perdido" || f === "perdido") return { status: "lost", temperature: "cold" };
  if (e === "cerrado") return { status: "won", temperature: "hot" };
  if (e === "más adelante" || e === "mas adelante")
    return { status: "nurture", temperature: "cold" };

  if (f.includes("asegurado")) return { status: "negotiation", temperature: "hot" };
  if (f === "propuesta enviada") return { status: "proposal_sent", temperature: "warm" };
  if (f.includes("propuesta en curso") || f.includes("propuesta"))
    return { status: "proposal_needed", temperature: "warm" };
  if (f.includes("potencial")) return { status: "interested", temperature: "cold" };
  return { status: "new", temperature: "cold" };
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: npx tsx scripts/import-xlsx-leads.ts <archivo.xlsx>");
    process.exit(1);
  }

  const user = await prisma.user.findFirstOrThrow();
  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], {
    defval: "",
    raw: false,
  });

  // Nombres ya existentes (leads y clientes, incluso archivados) para dedupe
  const [existingLeads, existingClients] = await Promise.all([
    prisma.lead.findMany({ select: { name: true } }),
    prisma.client.findMany({ select: { name: true } }),
  ]);
  const existing = new Set(
    [...existingLeads, ...existingClients].map((r) => normalizeName(r.name)),
  );

  const importedAt = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date());

  let created = 0;
  const skipped: string[] = [];
  const createdNames: string[] = [];

  for (const row of rows) {
    const rawName = String(row.Nombre ?? "").replace(/[\r\n]/g, " ").trim();
    if (!rawName) continue;

    const key = normalizeName(rawName);
    if (existing.has(key)) {
      skipped.push(rawName);
      continue;
    }
    existing.add(key);

    const { status, temperature } = mapStatus(row.Fase, row.Estado);
    const lastContactAt = parseSpanishDate(row["último contacto"]);
    const budgetRaw = String(row["Valor estimado"]).replace(",", ".").trim();
    const budget = budgetRaw && !Number.isNaN(Number(budgetRaw)) ? Number(budgetRaw) : null;
    const probRaw = String(row.Probabilidad).replace("%", "").replace(",", ".").trim();
    const probability =
      probRaw && !Number.isNaN(Number(probRaw)) ? Math.round(Number(probRaw)) : null;

    const contactRaw = String(row.Propietario ?? "").trim();
    const contact =
      contactRaw && contactRaw.toLowerCase() !== "tlf" ? titleCase(contactRaw) : null;

    const noteParts = [
      `Importado del Excel de prospección (${importedAt}).`,
      `Fase original: ${row.Fase || "—"}`,
      row.Estado ? `Estado original: ${row.Estado}` : null,
      String(row.Notas ?? "").trim() || null,
    ].filter(Boolean);

    const data: Prisma.LeadCreateInput = {
      name: titleCase(rawName),
      contact,
      status,
      temperature,
      source: "other",
      estimatedBudget: budget,
      probability,
      lastContactAt,
      firstContactAt: lastContactAt,
      internalNotes: noteParts.join("\n"),
      lostReason: status === "lost" ? "Marcado como perdido en el Excel" : null,
    };

    const lead = await prisma.lead.create({ data });
    created++;
    createdNames.push(`${lead.name} → ${status}`);
  }

  await audit({
    actorId: user.id,
    action: "import",
    entityType: "Lead",
    metadata: { source: "xlsx", file, created, skipped: skipped.length },
  });

  console.log(`\n✓ Import terminado: ${created} leads creados, ${skipped.length} omitidos por existir.`);
  for (const name of createdNames) console.log(`  + ${name}`);
  if (skipped.length) console.log(`  Omitidos: ${skipped.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
