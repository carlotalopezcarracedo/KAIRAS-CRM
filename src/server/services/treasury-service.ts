import { prisma } from "@/server/db/prisma";
import { startOfMonthMadrid } from "@/lib/dates";

/**
 * Tesorería: qué dinero entra y sale en los próximos meses, y cuánto de lo
 * cobrado ya es de Hacienda.
 *
 * Todo sale de datos que ya existen (recurrentes, facturas, pipeline y
 * gastos). Odoo sigue siendo la verdad fiscal: aquí solo se lee y se estima.
 */

/** Facturas emitidas pendientes de cobro. */
const PENDING_INVOICE_STATUSES = ["created_in_odoo", "sent", "overdue"] as const;

/** Facturas que cuentan como IVA repercutido (emitidas de verdad). */
const ISSUED_INVOICE_STATUSES = [
  "created_in_odoo",
  "sent",
  "overdue",
  "paid",
] as const;

const OPEN_OPPORTUNITY_STAGES = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
] as const;

/** Meses que avanza cada periodicidad. 0 = no periódica. */
const PERIOD_MONTHS: Record<string, number> = {
  weekly: 0, // se trata aparte: no encaja en saltos de mes
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  custom: 1,
};

function monthKey(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

function monthLabel(date: Date): string {
  const raw = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    month: "short",
    year: "2-digit",
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Trimestre natural que contiene la fecha, en hora de Madrid. */
export function quarterOf(now: Date): {
  quarter: number;
  year: number;
  from: Date;
  to: Date;
  label: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const quarter = Math.floor((month - 1) / 3) + 1;

  // Desplazamiento en meses desde el mes actual hasta el inicio del trimestre.
  const startOffset = (quarter - 1) * 3 + 1 - month;
  const from = startOfMonthMadrid(startOffset, now);
  const to = new Date(startOfMonthMadrid(startOffset + 3, now).getTime() - 1);

  return { quarter, year, from, to, label: `${quarter}T ${year}` };
}

export type TreasuryMonth = {
  key: string;
  label: string;
  recurring: number;
  invoices: number;
  pipeline: number;
  income: number;
  expenses: number;
  net: number;
  cumulative: number;
};

export async function getTreasuryOverview(monthsAhead = 6) {
  const now = new Date();
  const horizonEnd = startOfMonthMadrid(monthsAhead, now);
  const quarter = quarterOf(now);
  const threeMonthsAgo = startOfMonthMadrid(-3, now);
  const currentMonthStart = startOfMonthMadrid(0, now);

  const [recurring, pendingInvoices, openOpps, recentExpenses, quarterInvoices, quarterExpenses] =
    await Promise.all([
      prisma.recurringService.findMany({
        where: { deletedAt: null, status: "active" },
        select: {
          id: true,
          amount: true,
          periodicity: true,
          nextInvoiceAt: true,
          endsAt: true,
          client: { select: { name: true } },
        },
      }),
      prisma.invoiceRecord.findMany({
        where: {
          deletedAt: null,
          status: { in: [...PENDING_INVOICE_STATUSES] },
        },
        select: { id: true, amountTotal: true, dueAt: true, status: true },
      }),
      prisma.opportunity.findMany({
        where: {
          deletedAt: null,
          stage: { in: [...OPEN_OPPORTUNITY_STAGES] },
          expectedCloseAt: { not: null, lt: horizonEnd },
        },
        select: { id: true, estimatedValue: true, probability: true, expectedCloseAt: true },
      }),
      // Ritmo de gasto: media de los últimos 3 meses cerrados.
      prisma.expenseRecord.aggregate({
        where: { deletedAt: null, expenseAt: { gte: threeMonthsAgo, lt: currentMonthStart } },
        _sum: { amountTotal: true },
      }),
      // IVA repercutido del trimestre en curso.
      prisma.invoiceRecord.aggregate({
        where: {
          deletedAt: null,
          status: { in: [...ISSUED_INVOICE_STATUSES] },
          issuedAt: { gte: quarter.from, lte: quarter.to },
        },
        _sum: { amountNet: true, vatAmount: true },
        _count: true,
      }),
      // IVA soportado y gasto deducible del trimestre.
      prisma.expenseRecord.aggregate({
        where: {
          deletedAt: null,
          expenseAt: { gte: quarter.from, lte: quarter.to },
        },
        _sum: { amountNet: true, vatAmount: true, amountTotal: true },
        _count: true,
      }),
    ]);

  // --- Reparto por mes -----------------------------------------------------
  const buckets = new Map<string, TreasuryMonth>();
  const order: string[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const cursor = startOfMonthMadrid(i, now);
    const key = monthKey(cursor);
    order.push(key);
    buckets.set(key, {
      key,
      label: monthLabel(cursor),
      recurring: 0,
      invoices: 0,
      pipeline: 0,
      income: 0,
      expenses: 0,
      net: 0,
      cumulative: 0,
    });
  }

  const add = (key: string, field: "recurring" | "invoices" | "pipeline", value: number) => {
    const bucket = buckets.get(key);
    if (bucket) bucket[field] += value;
  };

  // Recurrentes: se proyectan los cobros reales avanzando por periodicidad,
  // no repartiendo el MRR. Un servicio anual entra de golpe en su mes.
  for (const service of recurring) {
    const amount = Number(service.amount);
    const step = PERIOD_MONTHS[service.periodicity] ?? 1;

    if (service.periodicity === "weekly") {
      // 4,33 semanas por mes: se reparte como importe mensual.
      for (const key of order) add(key, "recurring", amount * 4.33);
      continue;
    }
    if (step === 0) continue;

    let cursor = service.nextInvoiceAt ?? currentMonthStart;
    // Un ciclo ya vencido se cobra en el mes en curso.
    if (cursor < currentMonthStart) cursor = currentMonthStart;

    let guard = 0;
    while (cursor < horizonEnd && guard < 120) {
      if (service.endsAt && cursor > service.endsAt) break;
      add(monthKey(cursor), "recurring", amount);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + step, cursor.getDate());
      guard += 1;
    }
  }

  // Facturas emitidas: se esperan en su mes de vencimiento. Las ya vencidas
  // se llevan al mes en curso, que es cuando toca perseguirlas.
  let overdueAmount = 0;
  let pendingAmount = 0;
  for (const invoice of pendingInvoices) {
    const amount = Number(invoice.amountTotal ?? 0);
    pendingAmount += amount;
    const due = invoice.dueAt ?? currentMonthStart;
    if (due < currentMonthStart) {
      overdueAmount += amount;
      add(order[0], "invoices", amount);
    } else {
      add(monthKey(due), "invoices", amount);
    }
  }

  // Pipeline: ponderado por probabilidad. Es lo más incierto del cuadro.
  let pipelineTotal = 0;
  for (const opp of openOpps) {
    if (!opp.expectedCloseAt) continue;
    const weighted =
      (Number(opp.estimatedValue ?? 0) * (opp.probability ?? 0)) / 100;
    if (weighted <= 0) continue;
    pipelineTotal += weighted;
    const key = monthKey(
      opp.expectedCloseAt < currentMonthStart ? currentMonthStart : opp.expectedCloseAt,
    );
    add(key, "pipeline", weighted);
  }

  // Gasto: ritmo medio de los últimos 3 meses cerrados.
  const monthlyExpenseRate = Number(recentExpenses._sum.amountTotal ?? 0) / 3;

  let cumulative = 0;
  const months: TreasuryMonth[] = order.map((key) => {
    const bucket = buckets.get(key)!;
    bucket.expenses = monthlyExpenseRate;
    bucket.income = bucket.recurring + bucket.invoices + bucket.pipeline;
    bucket.net = bucket.income - bucket.expenses;
    cumulative += bucket.net;
    bucket.cumulative = cumulative;
    return bucket;
  });

  // --- Provisión de impuestos ---------------------------------------------
  const vatCharged = Number(quarterInvoices._sum.vatAmount ?? 0);
  const vatPaid = Number(quarterExpenses._sum.vatAmount ?? 0);
  const incomeNet = Number(quarterInvoices._sum.amountNet ?? 0);
  const expenseNet = Number(quarterExpenses._sum.amountNet ?? 0);
  const profit = incomeNet - expenseNet;

  return {
    months,
    firstNegativeMonth: months.find((m) => m.cumulative < 0)?.label ?? null,
    now: {
      pendingCollections: pendingAmount,
      overdueCollections: overdueAmount,
      monthlyExpenseRate,
      pipelineWeighted: pipelineTotal,
    },
    quarter: {
      label: quarter.label,
      from: quarter.from,
      to: quarter.to,
      invoiceCount: quarterInvoices._count,
      expenseCount: quarterExpenses._count,
      incomeNet,
      expenseNet,
      profit,
      vatCharged,
      vatPaid,
      /** Modelo 303: repercutido − soportado. Negativo = a compensar. */
      vatDue: vatCharged - vatPaid,
      /** Modelo 130: 20% del rendimiento. Nunca negativo. */
      irpfDue: profit > 0 ? Number((profit * 0.2).toFixed(2)) : 0,
    },
  };
}
