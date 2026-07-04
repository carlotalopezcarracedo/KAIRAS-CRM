import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type {
  InvoiceDraftInput,
  InvoiceFromHoursInput,
  InvoiceRecordInput,
} from "@/server/validators/invoice";
import type { InvoiceDraftStatus, InvoiceStatus } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

// ---------------------------------------------------------------------------
// Vista general de finanzas
// ---------------------------------------------------------------------------

export async function getFinanceOverview() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [pendingDrafts, pendingCollect, paidMonth, wonMonth, approvedHours] =
    await Promise.all([
      prisma.invoiceDraftRequest.aggregate({
        where: { ...notDeleted, status: { in: ["pending", "queued"] } },
        _count: true,
        _sum: { amountTotal: true },
      }),
      prisma.invoiceRecord.aggregate({
        where: {
          ...notDeleted,
          status: { in: ["created_in_odoo", "sent", "overdue"] },
        },
        _count: true,
        _sum: { amountTotal: true },
      }),
      prisma.invoiceRecord.aggregate({
        where: { ...notDeleted, status: "paid", paidAt: { gte: startOfMonth } },
        _count: true,
        _sum: { amountTotal: true },
      }),
      prisma.opportunity.aggregate({
        where: { ...notDeleted, stage: "won", updatedAt: { gte: startOfMonth } },
        _sum: { acceptedValue: true },
      }),
      prisma.timeEntry.aggregate({
        where: {
          ...notDeleted,
          billable: true,
          status: "approved",
          invoiceDraftRequestId: null,
        },
        _sum: { calculatedAmount: true, durationSeconds: true },
      }),
    ]);

  return {
    pendingIssueCount: pendingDrafts._count,
    pendingIssueSum: Number(pendingDrafts._sum.amountTotal ?? 0),
    pendingCollectCount: pendingCollect._count,
    pendingCollectSum: Number(pendingCollect._sum.amountTotal ?? 0),
    paidMonthCount: paidMonth._count,
    paidMonthSum: Number(paidMonth._sum.amountTotal ?? 0),
    acceptedMonthSum: Number(wonMonth._sum.acceptedValue ?? 0),
    approvedHoursAmount: Number(approvedHours._sum.calculatedAmount ?? 0),
    approvedHoursSeconds: approvedHours._sum.durationSeconds ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Cola de solicitudes (InvoiceDraftRequest)
// ---------------------------------------------------------------------------

export async function listDrafts() {
  return prisma.invoiceDraftRequest.findMany({
    where: notDeleted,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      client: { select: { id: true, name: true } },
      invoiceRecord: { select: { id: true, odooInvoiceNumber: true } },
      _count: { select: { timeEntries: true } },
    },
  });
}

export async function createDraft(actorId: string, input: InvoiceDraftInput) {
  const vatAmount = Number(((input.amountNet * input.vatRate) / 100).toFixed(2));
  const draft = await prisma.invoiceDraftRequest.create({
    data: {
      clientId: input.clientId,
      concept: input.concept,
      amountNet: input.amountNet,
      vatAmount,
      amountTotal: input.amountNet + vatAmount,
      notes: input.notes,
      status: "pending",
      lines: [
        {
          description: input.concept,
          quantity: 1,
          unitPrice: input.amountNet,
          vatRate: input.vatRate,
        },
      ],
    },
  });
  await audit({
    actorId,
    action: "invoice_queue",
    entityType: "InvoiceDraftRequest",
    entityId: draft.id,
    after: { concept: input.concept, amountTotal: draft.amountTotal?.toString() },
  });
  return draft;
}

/** Resumen de horas aprobadas sin facturar de un cliente. */
export async function getApprovedHoursForClient(clientId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: {
      ...notDeleted,
      clientId,
      billable: true,
      status: "approved",
      invoiceDraftRequestId: null,
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { startedAt: "asc" },
  });

  const byProject = new Map<
    string,
    { name: string; seconds: number; amount: number; entryIds: string[] }
  >();
  for (const e of entries) {
    const key = e.project?.id ?? "none";
    const row = byProject.get(key) ?? {
      name: e.project?.name ?? "Sin proyecto",
      seconds: 0,
      amount: 0,
      entryIds: [],
    };
    row.seconds += e.durationSeconds;
    row.amount += Number(e.calculatedAmount ?? 0);
    row.entryIds.push(e.id);
    byProject.set(key, row);
  }

  return {
    entries,
    groups: [...byProject.values()],
    totalSeconds: entries.reduce((acc, e) => acc + e.durationSeconds, 0),
    totalAmount: entries.reduce((acc, e) => acc + Number(e.calculatedAmount ?? 0), 0),
  };
}

/** Crea solicitud de factura agrupando horas aprobadas del cliente. */
export async function createDraftFromHours(
  actorId: string,
  input: InvoiceFromHoursInput,
) {
  const { entries, groups, totalAmount } = await getApprovedHoursForClient(
    input.clientId,
  );
  if (entries.length === 0) throw new Error("NO_HOURS");

  const amountNet = Number(totalAmount.toFixed(2));
  const vatAmount = Number(((amountNet * input.vatRate) / 100).toFixed(2));

  const draft = await prisma.invoiceDraftRequest.create({
    data: {
      clientId: input.clientId,
      concept:
        input.concept ??
        `Horas de trabajo — ${new Intl.DateTimeFormat("es-ES", {
          month: "long",
          year: "numeric",
        }).format(new Date())}`,
      amountNet,
      vatAmount,
      amountTotal: amountNet + vatAmount,
      status: "pending",
      lines: groups.map((g) => ({
        description: `${g.name} — ${(g.seconds / 3600).toFixed(2)} h`,
        quantity: Number((g.seconds / 3600).toFixed(2)),
        unitPrice: g.seconds > 0 ? Number((g.amount / (g.seconds / 3600)).toFixed(2)) : 0,
        vatRate: input.vatRate,
      })),
    },
  });

  await prisma.timeEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: { invoiceDraftRequestId: draft.id, status: "queued_for_invoice" },
  });

  await audit({
    actorId,
    action: "invoice_queue",
    entityType: "InvoiceDraftRequest",
    entityId: draft.id,
    metadata: { fromHours: true, entriesCount: entries.length },
  });
  return draft;
}

/**
 * Cambia el estado de una solicitud.
 * - created_in_odoo: bloquea las horas como facturadas.
 * - discarded: libera las horas (vuelven a aprobadas).
 */
export async function setDraftStatus(
  actorId: string,
  id: string,
  status: InvoiceDraftStatus,
  error?: string,
) {
  const before = await prisma.invoiceDraftRequest.findFirst({
    where: { id, ...notDeleted },
  });
  if (!before) throw new Error("NOT_FOUND");

  const draft = await prisma.invoiceDraftRequest.update({
    where: { id },
    data: { status, error: status === "error" ? (error ?? "Error") : null },
  });

  if (status === "created_in_odoo") {
    await prisma.timeEntry.updateMany({
      where: { invoiceDraftRequestId: id },
      data: { status: "invoiced", lockedAt: new Date(), lockedReason: "Facturada en Odoo" },
    });
  } else if (status === "discarded") {
    await prisma.timeEntry.updateMany({
      where: { invoiceDraftRequestId: id },
      data: {
        status: "approved",
        invoiceDraftRequestId: null,
        lockedAt: null,
        lockedReason: null,
      },
    });
  }

  await audit({
    actorId,
    action: "status_change",
    entityType: "InvoiceDraftRequest",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return draft;
}

// ---------------------------------------------------------------------------
// Snapshots de facturas reales (InvoiceRecord)
// ---------------------------------------------------------------------------

export async function listRecords() {
  return prisma.invoiceRecord.findMany({
    where: notDeleted,
    orderBy: [{ issuedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
    include: { client: { select: { id: true, name: true } } },
  });
}

export async function createRecord(
  actorId: string,
  input: InvoiceRecordInput,
  linkDraftId?: string,
) {
  const record = await prisma.invoiceRecord.create({
    data: {
      clientId: input.clientId || null,
      concept: input.concept,
      odooInvoiceNumber: input.odooInvoiceNumber,
      odooId: input.odooId,
      odooUrl: input.odooUrl,
      status: input.status,
      origin: "manual",
      amountNet: input.amountNet,
      vatAmount: input.vatAmount,
      amountTotal: input.amountTotal,
      issuedAt: input.issuedAt,
      dueAt: input.dueAt,
      paidAt: input.paidAt,
      notes: input.notes,
    },
  });

  if (linkDraftId) {
    await prisma.invoiceDraftRequest.update({
      where: { id: linkDraftId },
      data: { invoiceRecordId: record.id, status: "created_in_odoo" },
    });
    await prisma.timeEntry.updateMany({
      where: { invoiceDraftRequestId: linkDraftId },
      data: {
        status: "invoiced",
        invoiceRecordId: record.id,
        lockedAt: new Date(),
        lockedReason: "Facturada en Odoo",
      },
    });
  }

  await audit({
    actorId,
    action: "create",
    entityType: "InvoiceRecord",
    entityId: record.id,
    after: { concept: input.concept, amountTotal: String(input.amountTotal) },
  });
  return record;
}

export async function setRecordStatus(
  actorId: string,
  id: string,
  status: InvoiceStatus,
) {
  const before = await prisma.invoiceRecord.findFirst({
    where: { id, ...notDeleted },
  });
  if (!before) throw new Error("NOT_FOUND");

  const record = await prisma.invoiceRecord.update({
    where: { id },
    data: {
      status,
      paidAt: status === "paid" ? (before.paidAt ?? new Date()) : before.paidAt,
    },
  });
  await audit({
    actorId,
    action: "status_change",
    entityType: "InvoiceRecord",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return record;
}
