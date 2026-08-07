/**
 * Diagnostico de rendimiento de la capa de datos.
 *
 * Mide dos cosas:
 *
 * 1. Cuantas sentencias SQL emite Prisma por operacion. Es la medida que
 *    importa cuando la base esta lejos: cada sentencia es un viaje de ida y
 *    vuelta. Es determinista y vale en cualquier entorno.
 *
 * 2. Cuantas consultas llegan de verdad a ejecutarse a la vez. Sirve para
 *    comprobar que `connection_limit` no esta serializando el pool.
 *
 *    OJO: contra el servidor local de `npm run db:dev` esto SIEMPRE da 1.
 *    Ese servidor es un proxy que multiplexa sobre un unico enlace, asi que
 *    en local no se puede medir el efecto de `connection_limit`. Para que el
 *    numero signifique algo hay que apuntar a la base real:
 *      $env:DATABASE_URL = "<url del pooler de Supabase>"; npx tsx scripts/perf-bench.ts
 *
 * Ejecutar: npx tsx scripts/perf-bench.ts
 */
import { PrismaClient } from "@prisma/client";

function withLimit(url: string, limit: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set("connection_limit", String(limit));
  return parsed.toString();
}

function makeClient(url: string, limit: number) {
  const db = new PrismaClient({
    datasourceUrl: withLimit(url, limit),
    log: [{ emit: "event", level: "query" }],
  });
  const state = { count: 0, on: false };
  db.$on("query", () => {
    if (state.on) state.count += 1;
  });
  return { db, state };
}

async function countStatements(
  state: { count: number; on: boolean },
  fn: () => Promise<unknown>,
): Promise<number> {
  state.count = 0;
  state.on = true;
  await fn();
  state.on = false;
  // El log de eventos llega de forma asincrona; cede el turno antes de leer.
  await new Promise((resolve) => setTimeout(resolve, 60));
  return state.count;
}

/** Ficha de cliente: `include` con diez relaciones. */
function clientDetail(db: PrismaClient, id: string, strategy: "join" | "query") {
  return db.client.findFirst({
    relationLoadStrategy: strategy,
    where: { id, deletedAt: null },
    include: {
      company: true,
      contacts: { where: { deletedAt: null } },
      projects: { where: { deletedAt: null }, include: { mainService: { select: { name: true } } } },
      recurringServices: { where: { deletedAt: null }, include: { service: { select: { name: true } } } },
      opportunities: { where: { deletedAt: null }, take: 20 },
      invoiceRecords: { where: { deletedAt: null }, take: 20 },
      invoiceDrafts: { where: { deletedAt: null }, take: 20 },
      interactions: { where: { deletedAt: null }, take: 20 },
      notesRel: { where: { deletedAt: null }, take: 20 },
      leads: { where: { deletedAt: null }, select: { id: true } },
    },
  });
}

/** Listado de clientes con relaciones agregadas. */
function clientList(db: PrismaClient, strategy: "join" | "query") {
  return db.client.findMany({
    relationLoadStrategy: strategy,
    where: { deletedAt: null },
    include: {
      recurringServices: {
        where: { deletedAt: null, status: "active" },
        select: { amount: true, periodicity: true },
      },
      projects: { where: { deletedAt: null }, select: { id: true } },
      _count: { select: { invoiceRecords: true } },
    },
  });
}

async function measureConcurrency(baseUrl: string, limit: number) {
  const watcher = new PrismaClient({ datasourceUrl: withLimit(baseUrl, 3) });
  await watcher.$connect();
  const subject = new PrismaClient({ datasourceUrl: withLimit(baseUrl, limit) });
  await subject.$connect();
  await Promise.all(Array.from({ length: 4 }, () => subject.$queryRaw`SELECT 1`));

  const burst = Promise.all(
    Array.from({ length: 8 }, () => subject.$queryRaw`SELECT pg_sleep(0.3)::text`),
  );
  let peak = 0;
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 120));
    const rows = await watcher.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n
      FROM pg_stat_activity
      WHERE state = 'active' AND query LIKE '%pg_sleep%'
    `;
    peak = Math.max(peak, Number(rows[0]?.n ?? 0));
  }
  await burst;
  await subject.$disconnect();
  await watcher.$disconnect();
  return peak;
}

async function main() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("Falta DATABASE_URL");
  const isLocalProxy = /localhost|127\.0\.0\.1/.test(new URL(baseUrl).host);

  const { db, state } = makeClient(baseUrl, 10);
  await db.$connect();

  const [leads, clients, opps, projects, tasks, entries] = await Promise.all([
    db.lead.count(),
    db.client.count(),
    db.opportunity.count(),
    db.project.count(),
    db.task.count(),
    db.timeEntry.count(),
  ]);
  console.log(
    `volumen: leads=${leads} clientes=${clients} oportunidades=${opps} ` +
      `proyectos=${projects} tareas=${tasks} horas=${entries}\n`,
  );

  console.log("=== sentencias SQL por operacion (menos es mejor) ===");
  const sample = await db.client.findFirst({ where: { deletedAt: null }, select: { id: true } });
  if (sample) {
    const q = await countStatements(state, () => clientDetail(db, sample.id, "query"));
    const j = await countStatements(state, () => clientDetail(db, sample.id, "join"));
    console.log(`  ficha cliente   una consulta por relacion : ${q}`);
    console.log(`  ficha cliente   relationJoins (actual)    : ${j}`);
  } else {
    console.log("  (sin clientes en la base: no se puede medir la ficha)");
  }
  const lq = await countStatements(state, () => clientList(db, "query"));
  const lj = await countStatements(state, () => clientList(db, "join"));
  console.log(`  lista clientes  una consulta por relacion : ${lq}`);
  console.log(`  lista clientes  relationJoins (actual)    : ${lj}\n`);
  await db.$disconnect();

  console.log("=== paralelismo real del pool ===");
  console.log("  (8 consultas lentas lanzadas a la vez; se mira cuantas corren juntas)");
  for (const limit of [1, 8]) {
    const peak = await measureConcurrency(baseUrl, limit);
    console.log(`  connection_limit=${String(limit).padEnd(2)} -> ${peak} en paralelo`);
  }
  if (isLocalProxy) {
    console.log(
      "\n  AVISO: el servidor local de `npm run db:dev` multiplexa sobre un unico\n" +
        "  enlace, por eso da 1 en ambos casos. Este bloque solo es concluyente\n" +
        "  apuntando DATABASE_URL a la base real.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
