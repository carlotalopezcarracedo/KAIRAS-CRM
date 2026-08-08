import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { getExpenseDefaults } from "@/server/services/settings-service";
import { startOfMonthMadrid } from "@/lib/dates";
import type { ExpenseInput } from "@/server/validators/expense";
import type { Prisma, ExpenseKind } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

export type ComputedAmount = {
  amountNet: number | null;
  vatAmount: number | null;
  amountTotal: number;
  ratePerKm: number | null;
};

/**
 * Importe según el tipo de gasto.
 *
 * - Kilometraje y dietas se CALCULAN a partir de las tarifas de Ajustes: son
 *   compensaciones a tanto alzado, sin IVA soportado que deducir.
 * - Gasolina, peajes y otros se teclean con su neto e IVA del ticket.
 */
export async function computeExpenseAmount(
  input: Pick<
    ExpenseInput,
    | "kind"
    | "kilometers"
    | "ratePerKm"
    | "roundTrip"
    | "perDiemDays"
    | "overnight"
    | "amountNet"
    | "vatAmount"
  >,
): Promise<ComputedAmount> {
  const defaults = await getExpenseDefaults();

  if (input.kind === "mileage") {
    const rate = input.ratePerKm ?? defaults.ratePerKm;
    const km = (input.kilometers ?? 0) * (input.roundTrip ? 2 : 1);
    const total = Number((km * rate).toFixed(2));
    return { amountNet: total, vatAmount: null, amountTotal: total, ratePerKm: rate };
  }

  if (input.kind === "per_diem") {
    const perDay = input.overnight ? defaults.perDiemOvernight : defaults.perDiemDay;
    const total = Number(((input.perDiemDays ?? 0) * perDay).toFixed(2));
    return { amountNet: total, vatAmount: null, amountTotal: total, ratePerKm: null };
  }

  const net = input.amountNet ?? 0;
  const vat = input.vatAmount ?? 0;
  return {
    amountNet: net,
    vatAmount: input.vatAmount ?? null,
    amountTotal: Number((net + vat).toFixed(2)),
    ratePerKm: null,
  };
}

export type ExpenseFilters = {
  kind?: string;
  from?: Date;
  to?: Date;
  projectId?: string;
};

export async function listExpenses(filters: ExpenseFilters = {}) {
  const where: Prisma.ExpenseRecordWhereInput = {
    ...notDeleted,
    ...(filters.kind ? { kind: filters.kind as ExpenseKind } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.from || filters.to
      ? {
          expenseAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const monthStart = startOfMonthMadrid(0, new Date());

  const [expenses, byKind, monthAgg] = await Promise.all([
    prisma.expenseRecord.findMany({
      where,
      orderBy: [{ expenseAt: "desc" }, { createdAt: "desc" }],
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    // Reparto por tipo del periodo filtrado, agrupado en Postgres.
    prisma.expenseRecord.groupBy({
      by: ["kind"],
      where,
      _count: { _all: true },
      _sum: { amountTotal: true, kilometers: true },
    }),
    prisma.expenseRecord.aggregate({
      where: { ...notDeleted, expenseAt: { gte: monthStart } },
      _sum: { amountTotal: true },
    }),
  ]);

  const totals = byKind.reduce(
    (acc, row) => ({
      amount: acc.amount + Number(row._sum.amountTotal ?? 0),
      km: acc.km + Number(row._sum.kilometers ?? 0),
      count: acc.count + row._count._all,
    }),
    { amount: 0, km: 0, count: 0 },
  );

  return {
    expenses,
    byKind: byKind.map((row) => ({
      kind: row.kind,
      count: row._count._all,
      amount: Number(row._sum.amountTotal ?? 0),
      kilometers: Number(row._sum.kilometers ?? 0),
    })),
    stats: {
      ...totals,
      monthAmount: Number(monthAgg._sum.amountTotal ?? 0),
    },
  };
}

export async function getExpense(id: string) {
  return prisma.expenseRecord.findFirst({
    where: { id, ...notDeleted },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

export async function getExpenseFormOptions() {
  const [clients, projects, defaults] = await Promise.all([
    prisma.client.findMany({
      where: notDeleted,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { ...notDeleted, status: { notIn: ["completed", "cancelled"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    getExpenseDefaults(),
  ]);
  return { clients, projects, defaults };
}

async function dataFrom(input: ExpenseInput) {
  const amounts = await computeExpenseAmount(input);
  return {
    kind: input.kind,
    description: input.description,
    expenseAt: input.expenseAt,
    originPlace: input.originPlace ?? null,
    destinationPlace: input.destinationPlace ?? null,
    kilometers: input.kind === "mileage" ? (input.kilometers ?? null) : null,
    ratePerKm: amounts.ratePerKm,
    roundTrip: input.kind === "mileage" ? input.roundTrip : false,
    perDiemDays: input.kind === "per_diem" ? (input.perDiemDays ?? null) : null,
    overnight: input.kind === "per_diem" ? input.overnight : false,
    amountNet: amounts.amountNet,
    vatAmount: amounts.vatAmount,
    amountTotal: amounts.amountTotal,
    supplier: input.supplier ?? null,
    receiptUrl: input.receiptUrl ?? null,
    notes: input.notes ?? null,
    billable: input.billable,
    clientId: input.clientId ?? null,
    projectId: input.projectId ?? null,
  };
}

export async function createExpense(userId: string, input: ExpenseInput) {
  const expense = await prisma.expenseRecord.create({
    data: { ...(await dataFrom(input)), userId, source: "manual" },
  });

  await audit({
    actorId: userId,
    action: "create",
    entityType: "ExpenseRecord",
    entityId: expense.id,
    after: { kind: expense.kind, amountTotal: expense.amountTotal.toString() },
  });
  return expense;
}

export async function updateExpense(
  userId: string,
  id: string,
  input: ExpenseInput,
) {
  const before = await prisma.expenseRecord.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  // Los peajes importados son el reflejo de una factura de Odoo: se pueden
  // clasificar, pero no reescribir sus importes.
  if (before.source === "odoo") throw new Error("IMPORTED");

  const expense = await prisma.expenseRecord.update({
    where: { id },
    data: await dataFrom(input),
  });

  await audit({
    actorId: userId,
    action: "update",
    entityType: "ExpenseRecord",
    entityId: id,
    before: { amountTotal: before.amountTotal.toString() },
    after: { amountTotal: expense.amountTotal.toString() },
  });
  return expense;
}

/** Clasificación de un gasto importado: proyecto, cliente y repercusión. */
export async function assignExpense(
  userId: string,
  id: string,
  assignment: { clientId?: string | null; projectId?: string | null; billable?: boolean },
) {
  const before = await prisma.expenseRecord.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const expense = await prisma.expenseRecord.update({
    where: { id },
    data: {
      clientId: assignment.clientId ?? null,
      projectId: assignment.projectId ?? null,
      ...(assignment.billable === undefined ? {} : { billable: assignment.billable }),
    },
  });

  await audit({
    actorId: userId,
    action: "update",
    entityType: "ExpenseRecord",
    entityId: id,
    metadata: { assigned: true },
  });
  return expense;
}

export async function softDeleteExpense(userId: string, id: string) {
  const expense = await prisma.expenseRecord.findFirst({ where: { id, ...notDeleted } });
  if (!expense) throw new Error("NOT_FOUND");

  await prisma.expenseRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId: userId,
    action: "delete",
    entityType: "ExpenseRecord",
    entityId: id,
    before: { kind: expense.kind, amountTotal: expense.amountTotal.toString() },
  });
}
