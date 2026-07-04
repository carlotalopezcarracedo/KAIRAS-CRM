import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type {
  ClientCreateInput,
  ClientUpdateInput,
  ContactCreateInput,
} from "@/server/validators/client";

const notDeleted = { deletedAt: null } as const;

function monthlyEquivalent(amount: number, periodicity: string): number {
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

export async function listClients() {
  const clients = await prisma.client.findMany({
    where: notDeleted,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      recurringServices: {
        where: { deletedAt: null, status: "active" },
        select: { amount: true, periodicity: true },
      },
      projects: {
        where: {
          deletedAt: null,
          status: { notIn: ["completed", "cancelled"] },
        },
        select: { id: true },
      },
      _count: { select: { invoiceRecords: true } },
    },
  });

  return clients.map((c) => ({
    ...c,
    mrr: c.recurringServices.reduce(
      (acc, r) => acc + monthlyEquivalent(Number(r.amount), r.periodicity),
      0,
    ),
    activeProjectsCount: c.projects.length,
  }));
}

export async function getClientFull(id: string) {
  const client = await prisma.client.findFirst({
    where: { id, ...notDeleted },
    include: {
      company: true,
      contacts: { where: { deletedAt: null }, orderBy: { firstName: "asc" } },
      projects: {
        where: notDeleted,
        orderBy: { updatedAt: "desc" },
        include: { mainService: { select: { name: true } } },
      },
      recurringServices: {
        where: notDeleted,
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      opportunities: {
        where: notDeleted,
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      invoiceRecords: {
        where: notDeleted,
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      invoiceDrafts: {
        where: notDeleted,
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      interactions: {
        where: notDeleted,
        orderBy: { occurredAt: "desc" },
        take: 20,
      },
      notesRel: { where: notDeleted, orderBy: { createdAt: "desc" }, take: 20 },
      leads: { where: notDeleted, select: { id: true, name: true, status: true } },
    },
  });
  if (!client) return null;

  // Horas registradas (total y facturables)
  const hours = await prisma.timeEntry.aggregate({
    where: { clientId: id, deletedAt: null },
    _sum: { durationSeconds: true, calculatedAmount: true },
  });
  const billableHours = await prisma.timeEntry.aggregate({
    where: { clientId: id, deletedAt: null, billable: true },
    _sum: { durationSeconds: true },
  });

  const mrr = client.recurringServices
    .filter((r) => r.status === "active")
    .reduce(
      (acc, r) => acc + monthlyEquivalent(Number(r.amount), r.periodicity),
      0,
    );

  const invoicedTotal = client.invoiceRecords
    .filter((r) => r.status === "paid")
    .reduce((acc, r) => acc + Number(r.amountTotal ?? 0), 0);
  const pendingTotal = client.invoiceRecords
    .filter((r) => ["created_in_odoo", "sent", "overdue"].includes(r.status))
    .reduce((acc, r) => acc + Number(r.amountTotal ?? 0), 0);

  return {
    client,
    mrr,
    invoicedTotal,
    pendingTotal,
    totalSeconds: hours._sum.durationSeconds ?? 0,
    billableSeconds: billableHours._sum.durationSeconds ?? 0,
    estimatedAmount: Number(hours._sum.calculatedAmount ?? 0),
  };
}

export async function createClient(actorId: string, input: ClientCreateInput) {
  const client = await prisma.client.create({
    data: { ...input, satisfaction: input.satisfaction ?? null },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Client",
    entityId: client.id,
    after: { name: client.name, status: client.status },
  });
  return client;
}

export async function updateClient(
  actorId: string,
  id: string,
  input: ClientUpdateInput,
) {
  const before = await prisma.client.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");
  const client = await prisma.client.update({ where: { id }, data: input });
  await audit({
    actorId,
    action: "update",
    entityType: "Client",
    entityId: id,
    before: { status: before.status },
    after: { status: client.status },
  });
  return client;
}

export async function softDeleteClient(actorId: string, id: string) {
  const client = await prisma.client.findFirst({ where: { id, ...notDeleted } });
  if (!client) throw new Error("NOT_FOUND");
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "Client",
    entityId: id,
    before: { name: client.name },
  });
}

/**
 * Convierte un lead en cliente:
 * - crea el cliente con los datos del lead,
 * - vincula lead.clientId y lo marca como cliente activo,
 * - vincula las oportunidades abiertas del lead al cliente.
 */
export async function convertLeadToClient(actorId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...notDeleted },
  });
  if (!lead) throw new Error("NOT_FOUND");
  if (lead.clientId) return { clientId: lead.clientId, alreadyExisted: true };

  const client = await prisma.client.create({
    data: {
      name: lead.name,
      status: "active",
      phone: lead.phone,
      billingEmail: lead.email,
      city: lead.city,
      province: lead.province,
      companyId: lead.companyId,
      notes: lead.internalNotes,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { clientId: client.id, status: "client_active" },
  });

  await prisma.opportunity.updateMany({
    where: { leadId, deletedAt: null, clientId: null },
    data: { clientId: client.id },
  });

  await audit({
    actorId,
    action: "create",
    entityType: "Client",
    entityId: client.id,
    metadata: { convertedFromLeadId: leadId },
    after: { name: client.name },
  });

  return { clientId: client.id, alreadyExisted: false };
}

export async function addClientContact(
  actorId: string,
  clientId: string,
  input: ContactCreateInput,
) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, ...notDeleted },
  });
  if (!client) throw new Error("NOT_FOUND");

  const person = await prisma.person.create({
    data: {
      ...input,
      companyId: client.companyId,
      clientContacts: { connect: { id: clientId } },
    },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Person",
    entityId: person.id,
    metadata: { clientId },
  });
  return person;
}
