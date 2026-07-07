import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { recordInternalEvent } from "@/integrations/meta/conversions-api";
import type { ServiceInput, RecurringInput } from "@/server/validators/catalog";

const notDeleted = { deletedAt: null } as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

// ---------------------------------------------------------------------------
// Servicios
// ---------------------------------------------------------------------------

export async function listServices(includeInactive = true) {
  return prisma.service.findMany({
    where: { ...notDeleted, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { projectsMain: true, recurringServices: true, opportunities: true },
      },
    },
  });
}

/** Crea o actualiza la tarifa €/h propia del servicio. */
async function upsertServiceRate(serviceId: string, rate: number | undefined) {
  if (rate === undefined || rate <= 0) return;
  const existing = await prisma.hourlyRate.findFirst({
    where: { scope: "service", serviceId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (Number(existing.rate) !== rate) {
      await prisma.hourlyRate.update({ where: { id: existing.id }, data: { rate } });
    }
  } else {
    await prisma.hourlyRate.create({
      data: { scope: "service", serviceId, rate, notes: "Definida desde el servicio" },
    });
  }
}

export async function createService(actorId: string, input: ServiceInput) {
  const base = slugify(input.name) || "servicio";
  let slug = base;
  let attempt = 1;
  while (await prisma.service.findUnique({ where: { slug } })) {
    slug = `${base}_${++attempt}`;
  }

  const { hourlyRate, ...data } = input;
  const service = await prisma.service.create({ data: { ...data, slug } });
  await upsertServiceRate(service.id, hourlyRate);
  await audit({
    actorId,
    action: "create",
    entityType: "Service",
    entityId: service.id,
    after: { name: service.name },
  });
  return service;
}

export async function updateService(
  actorId: string,
  id: string,
  input: ServiceInput,
) {
  const before = await prisma.service.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  const { hourlyRate, ...data } = input;
  const service = await prisma.service.update({ where: { id }, data });
  await upsertServiceRate(id, hourlyRate);
  await audit({
    actorId,
    action: "update",
    entityType: "Service",
    entityId: id,
    before: { name: before.name, active: before.active },
    after: { name: service.name, active: service.active },
  });
  return service;
}

// ---------------------------------------------------------------------------
// Recurrentes
// ---------------------------------------------------------------------------

export function advanceCycle(date: Date, periodicity: string): Date {
  const next = new Date(date);
  switch (periodicity) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function monthlyEquivalent(amount: number, periodicity: string): number {
  switch (periodicity) {
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "weekly":
      return amount * 4.33;
    default:
      return amount;
  }
}

export async function listRecurring() {
  const rows = await prisma.recurringService.findMany({
    where: notDeleted,
    orderBy: [{ status: "asc" }, { nextInvoiceAt: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, vatRate: true } },
    },
  });
  const mrr = rows
    .filter((r) => r.status === "active")
    .reduce((acc, r) => acc + monthlyEquivalent(Number(r.amount), r.periodicity), 0);
  return { rows, mrr };
}

export async function createRecurring(actorId: string, input: RecurringInput) {
  const nextInvoiceAt =
    input.nextInvoiceAt ??
    (() => {
      // primer ciclo: día de facturación del mes siguiente al inicio
      const d = new Date(input.startedAt);
      d.setDate(input.billingDay);
      if (d <= input.startedAt) d.setMonth(d.getMonth() + 1);
      return d;
    })();

  const recurring = await prisma.recurringService.create({
    data: { ...input, nextInvoiceAt },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "RecurringService",
    entityId: recurring.id,
    after: { clientId: input.clientId, amount: String(input.amount) },
  });

  if (input.status === "active") {
    const lead = await prisma.lead.findFirst({
      where: { clientId: input.clientId, deletedAt: null },
      select: { id: true },
    });
    await recordInternalEvent({
      event: "recurring_client_started",
      leadId: lead?.id ?? null,
      value: input.amount,
    });
  }
  return recurring;
}

export async function updateRecurring(
  actorId: string,
  id: string,
  input: RecurringInput,
) {
  const before = await prisma.recurringService.findFirst({
    where: { id, ...notDeleted },
  });
  if (!before) throw new Error("NOT_FOUND");
  const recurring = await prisma.recurringService.update({
    where: { id },
    data: input,
  });
  await audit({
    actorId,
    action: "update",
    entityType: "RecurringService",
    entityId: id,
    before: { status: before.status },
    after: { status: recurring.status },
  });
  return recurring;
}

export async function softDeleteRecurring(actorId: string, id: string) {
  const recurring = await prisma.recurringService.findFirst({
    where: { id, ...notDeleted },
  });
  if (!recurring) throw new Error("NOT_FOUND");
  await prisma.recurringService.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await audit({
    actorId,
    action: "delete",
    entityType: "RecurringService",
    entityId: id,
  });
}

/** Crea una solicitud de factura del ciclo actual y avanza el próximo ciclo. */
export async function generateRecurringInvoiceDraft(actorId: string, id: string) {
  const recurring = await prisma.recurringService.findFirst({
    where: { id, ...notDeleted },
    include: {
      client: { select: { name: true } },
      service: { select: { name: true, vatRate: true } },
    },
  });
  if (!recurring) throw new Error("NOT_FOUND");

  const cycleDate = recurring.nextInvoiceAt ?? new Date();
  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(cycleDate);

  const amountNet = Number(recurring.amount);
  const vatRate = Number(recurring.service.vatRate);
  const vatAmount = Number(((amountNet * vatRate) / 100).toFixed(2));

  const draft = await prisma.invoiceDraftRequest.create({
    data: {
      clientId: recurring.clientId,
      recurringServiceId: recurring.id,
      concept: `${recurring.title ?? recurring.service.name} — ${monthLabel}`,
      amountNet,
      vatAmount,
      amountTotal: amountNet + vatAmount,
      status: "pending",
      lines: [
        {
          description: `${recurring.title ?? recurring.service.name} (${monthLabel})`,
          quantity: 1,
          unitPrice: amountNet,
          vatRate,
        },
      ],
    },
  });

  await prisma.recurringService.update({
    where: { id },
    data: { nextInvoiceAt: advanceCycle(cycleDate, recurring.periodicity) },
  });

  await audit({
    actorId,
    action: "invoice_queue",
    entityType: "InvoiceDraftRequest",
    entityId: draft.id,
    metadata: { recurringServiceId: id, cycle: monthLabel },
  });
  return draft;
}
