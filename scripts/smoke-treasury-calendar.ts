/**
 * Smoke test de tesorería y del feed de calendario.
 * Crea datos con prefijo SMOKE y los elimina al final.
 *
 * Ejecutar: npx tsx scripts/smoke-treasury-calendar.ts
 */
import { prisma } from "@/server/db/prisma";
import { getTreasuryOverview, quarterOf } from "@/server/services/treasury-service";
import {
  ensureCalendarFeedToken,
  regenerateCalendarFeedToken,
  disableCalendarFeed,
  getCalendarFeedToken,
  tokenMatches,
  buildCalendarFeed,
} from "@/server/services/calendar-feed-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALLO: ${message}`);
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  assert(user, "hace falta al menos una usuaria en la base");
  const previousFeed = await prisma.settings.findUnique({
    where: { key: "calendar.feed" },
  });

  // --- trimestres -------------------------------------------------------
  const q1 = quarterOf(new Date("2026-02-15T10:00:00Z"));
  assert(q1.quarter === 1 && q1.year === 2026, `febrero es 1T (dio ${q1.label})`);
  const q4 = quarterOf(new Date("2026-11-20T10:00:00Z"));
  assert(q4.quarter === 4, `noviembre es 4T (dio ${q4.label})`);
  // El inicio del 4T es el 1 de octubre en hora de Madrid.
  assert(
    q4.from.toISOString().slice(0, 7) === "2026-09",
    `el 4T arranca el 1 de octubre en Madrid (dio ${q4.from.toISOString()})`,
  );
  assert(q4.to > q4.from, "el fin del trimestre es posterior al inicio");
  console.log(`✓ trimestres correctos: ${q1.label} y ${q4.label}`);

  // --- tesorería con datos conocidos ------------------------------------
  const client = await prisma.client.create({
    data: { name: "SMOKE Cliente tesoreria", status: "active" },
  });
  const service = await prisma.service.create({
    data: { name: "SMOKE Servicio", slug: "smoke-servicio", category: "consulting" },
  });
  const recurring = await prisma.recurringService.create({
    data: {
      clientId: client.id,
      serviceId: service.id,
      amount: 500,
      periodicity: "monthly",
      status: "active",
      startedAt: new Date(),
      nextInvoiceAt: new Date(),
    },
  });
  const invoice = await prisma.invoiceRecord.create({
    data: {
      clientId: client.id,
      status: "sent",
      amountNet: 1000,
      vatAmount: 210,
      amountTotal: 1210,
      issuedAt: new Date(),
      dueAt: new Date(),
    },
  });
  const expense = await prisma.expenseRecord.create({
    data: {
      kind: "fuel",
      description: "SMOKE Gasto tesoreria",
      amountNet: 100,
      vatAmount: 21,
      amountTotal: 121,
      expenseAt: new Date(),
    },
  });

  const overview = await getTreasuryOverview(6);
  assert(overview.months.length === 6, "proyecta seis meses");
  assert(
    overview.months.every((m) => m.income === m.recurring + m.invoices + m.pipeline),
    "los ingresos son la suma de sus partes",
  );
  // El acumulado es la suma corrida de los netos.
  let running = 0;
  for (const month of overview.months) {
    running += month.net;
    assert(
      Math.abs(month.cumulative - running) < 0.01,
      `acumulado correcto en ${month.label}`,
    );
  }
  assert(
    overview.months[0].recurring >= 500,
    `el recurrente mensual entra en el primer mes (dio ${overview.months[0].recurring})`,
  );
  assert(
    overview.now.pendingCollections >= 1210,
    "la factura emitida cuenta como pendiente de cobro",
  );
  console.log(
    `✓ previsión: ${overview.months.length} meses, ` +
      `${overview.now.pendingCollections.toFixed(2)} € pendientes de cobro`,
  );

  // IVA: 210 repercutido − 21 soportado = 189
  assert(
    overview.quarter.vatCharged >= 210 && overview.quarter.vatPaid >= 21,
    "el IVA del trimestre recoge factura y gasto",
  );
  const expectedVat = overview.quarter.vatCharged - overview.quarter.vatPaid;
  assert(
    Math.abs(overview.quarter.vatDue - expectedVat) < 0.01,
    "IVA a pagar = repercutido − soportado",
  );
  assert(overview.quarter.irpfDue >= 0, "el IRPF nunca es negativo");
  if (overview.quarter.profit > 0) {
    assert(
      Math.abs(overview.quarter.irpfDue - overview.quarter.profit * 0.2) < 0.02,
      "IRPF = 20% del rendimiento",
    );
  }
  console.log(
    `✓ impuestos ${overview.quarter.label}: IVA ${overview.quarter.vatDue.toFixed(2)} €, ` +
      `IRPF ${overview.quarter.irpfDue.toFixed(2)} €`,
  );

  // --- feed de calendario ------------------------------------------------
  const event = await prisma.calendarEvent.create({
    data: {
      title: "SMOKE Reunión; con acentos, y comas",
      description: "Línea 1\nLínea 2",
      startAt: new Date(Date.now() + 86_400_000),
      endAt: new Date(Date.now() + 90_000_000),
      location: "A Coruña",
      status: "scheduled",
      clientId: client.id,
    },
  });
  const cancelled = await prisma.calendarEvent.create({
    data: {
      title: "SMOKE Anulada",
      startAt: new Date(Date.now() + 172_800_000),
      status: "cancelled",
    },
  });

  const token = await ensureCalendarFeedToken(user.id);
  assert(token.length === 48, `token de 48 caracteres (dio ${token.length})`);
  assert(await getCalendarFeedToken(), "el token queda guardado");
  assert(tokenMatches(token, token), "el token correcto valida");
  assert(!tokenMatches("x".repeat(48), token), "un token falso no valida");
  assert(!tokenMatches(token, null), "sin feed activo nada valida");
  console.log("✓ token generado y comparado en tiempo constante");

  const regenerated = await ensureCalendarFeedToken(user.id);
  assert(regenerated === token, "no regenera si ya existe");
  const fresh = await regenerateCalendarFeedToken(user.id);
  assert(fresh !== token, "regenerar cambia el token");
  assert(!tokenMatches(token, fresh), "el token anterior deja de valer");
  console.log("✓ regenerar invalida el enlace anterior");

  const ics = await buildCalendarFeed("https://kairas-crm.vercel.app");
  assert(ics.startsWith("BEGIN:VCALENDAR"), "el feed es un VCALENDAR");
  assert(ics.includes("END:VCALENDAR"), "el feed cierra bien");
  assert(
    ics.includes(`UID:${event.id}@kairas-crm.vercel.app`),
    "el UID es estable y lleva el host",
  );
  assert(
    ics.includes("SUMMARY:SMOKE Reunión\\; con acentos\\, y comas"),
    "escapa punto y coma y comas del título",
  );
  assert(ics.includes("Cliente: SMOKE Cliente tesoreria"), "añade el contexto del cliente");
  assert(ics.includes("STATUS:CANCELLED"), "el cancelado se publica como CANCELLED");
  assert(!/[^\r]\n/.test(ics), "todas las líneas acaban en CRLF");
  for (const line of ics.split("\r\n")) {
    assert(
      Buffer.byteLength(line, "utf8") <= 75,
      `línea plegada a 75 octetos: "${line.slice(0, 40)}…"`,
    );
  }
  console.log(
    `✓ feed generado: ${ics.split("BEGIN:VEVENT").length - 1} eventos, ` +
      "escapado y plegado correctos",
  );

  // --- limpieza -----------------------------------------------------------
  await disableCalendarFeed(user.id);
  assert(!(await getCalendarFeedToken()), "desactivar borra el token");
  console.log("✓ desactivar deja el feed sin token");

  await prisma.calendarEvent.deleteMany({ where: { id: { in: [event.id, cancelled.id] } } });
  await prisma.expenseRecord.delete({ where: { id: expense.id } });
  await prisma.invoiceRecord.delete({ where: { id: invoice.id } });
  await prisma.recurringService.delete({ where: { id: recurring.id } });
  await prisma.service.delete({ where: { id: service.id } });
  await prisma.client.delete({ where: { id: client.id } });
  await prisma.auditLog.deleteMany({
    where: { entityType: "Settings", metadata: { path: ["key"], equals: "calendar.feed" } },
  });
  if (previousFeed) {
    await prisma.settings.update({
      where: { key: "calendar.feed" },
      data: { value: previousFeed.value ?? {} },
    });
  } else {
    await prisma.settings.deleteMany({ where: { key: "calendar.feed" } });
  }
  console.log("✓ datos SMOKE eliminados");

  console.log("\nTODO OK — tesorería y calendario verificados");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
