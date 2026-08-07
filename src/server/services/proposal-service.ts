import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type { ProposalInput } from "@/server/validators/proposal";
import type { Prisma, ProposalStatus } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

/** Estados que cuentan como "viva" a efectos de seguimiento comercial. */
const OPEN_STATUSES: ProposalStatus[] = ["draft", "sent", "viewed", "followed_up"];

/**
 * El bruto se deriva siempre del neto y el IVA: guardar los dos importes por
 * separado invita a que se desincronicen. `null` si no hay neto todavía
 * (una propuesta en borrador puede no tener precio cerrado).
 */
function grossFrom(net: number | undefined, vatRate: number): number | null {
  if (net === undefined) return null;
  return Number((net * (1 + vatRate / 100)).toFixed(2));
}

/** Relaciones mínimas para pintar listados y fichas sin consultas extra. */
const listInclude = {
  lead: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true, stage: true } },
  _count: { select: { projects: true } },
} satisfies Prisma.ProposalInclude;

export type ProposalFilters = {
  status?: string;
  q?: string;
};

export async function listProposals(filters: ProposalFilters = {}) {
  const where: Prisma.ProposalWhereInput = {
    ...notDeleted,
    ...(filters.status === "open"
      ? { status: { in: OPEN_STATUSES } }
      : filters.status
        ? { status: filters.status as ProposalStatus }
        : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { client: { name: { contains: filters.q, mode: "insensitive" } } },
            { lead: { name: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [proposals, openAgg, acceptedAgg] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: listInclude,
    }),
    prisma.proposal.aggregate({
      where: { ...notDeleted, status: { in: OPEN_STATUSES } },
      _count: true,
      _sum: { amountNet: true },
    }),
    prisma.proposal.aggregate({
      where: { ...notDeleted, status: "accepted" },
      _count: true,
      _sum: { amountNet: true },
    }),
  ]);

  const decided = openAgg._count + acceptedAgg._count;

  return {
    proposals,
    stats: {
      openCount: openAgg._count,
      openAmount: Number(openAgg._sum.amountNet ?? 0),
      acceptedCount: acceptedAgg._count,
      acceptedAmount: Number(acceptedAgg._sum.amountNet ?? 0),
      // Tasa de aceptación sobre lo que ya tiene desenlace o sigue vivo.
      winRate: decided > 0 ? Math.round((acceptedAgg._count / decided) * 100) : 0,
    },
  };
}

export async function getProposal(id: string) {
  return prisma.proposal.findFirst({
    where: { id, ...notDeleted },
    include: {
      ...listInclude,
      services: { select: { id: true, name: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
  });
}

/** Catálogos para los desplegables del formulario. */
export async function getProposalFormOptions() {
  const [leads, clients, opportunities] = await Promise.all([
    prisma.lead.findMany({
      where: { ...notDeleted, status: { notIn: ["lost", "do_not_contact"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: notDeleted,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.opportunity.findMany({
      where: notDeleted,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);
  return { leads, clients, opportunities };
}

function dataFrom(input: ProposalInput) {
  return {
    title: input.title,
    status: input.status,
    leadId: input.leadId ?? null,
    clientId: input.clientId ?? null,
    opportunityId: input.opportunityId ?? null,
    amountNet: input.amountNet ?? null,
    vatRate: input.vatRate,
    amountTotal: grossFrom(input.amountNet, input.vatRate),
    sentAt: input.sentAt ?? null,
    validUntil: input.validUntil ?? null,
    documentUrl: input.documentUrl ?? null,
    conditions: input.conditions ?? null,
    rejectedReason: input.rejectedReason ?? null,
    notes: input.notes ?? null,
  };
}

export async function createProposal(actorId: string, input: ProposalInput) {
  const data = dataFrom(input);
  const proposal = await prisma.proposal.create({
    data: {
      ...data,
      // Enviar ya en el alta debe dejar constancia de la fecha.
      sentAt: data.sentAt ?? (input.status === "sent" ? new Date() : null),
      acceptedAt: input.status === "accepted" ? new Date() : null,
    },
  });

  await audit({
    actorId,
    action: "create",
    entityType: "Proposal",
    entityId: proposal.id,
    after: { title: proposal.title, status: proposal.status },
  });
  return proposal;
}

export async function updateProposal(
  actorId: string,
  id: string,
  input: ProposalInput,
) {
  const before = await prisma.proposal.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const data = dataFrom(input);
  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      ...data,
      // Las marcas de tiempo se ponen al entrar en el estado, y no se borran
      // si luego se corrige algo del formulario.
      sentAt:
        data.sentAt ??
        (input.status !== "draft" ? (before.sentAt ?? new Date()) : before.sentAt),
      acceptedAt:
        input.status === "accepted" ? (before.acceptedAt ?? new Date()) : before.acceptedAt,
    },
  });

  await audit({
    actorId,
    action: "update",
    entityType: "Proposal",
    entityId: id,
    before: { status: before.status, amountNet: before.amountNet?.toString() ?? null },
    after: { status: proposal.status, amountNet: proposal.amountNet?.toString() ?? null },
  });
  return proposal;
}

export async function setProposalStatus(
  actorId: string,
  id: string,
  status: ProposalStatus,
) {
  const before = await prisma.proposal.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      status,
      sentAt: status !== "draft" ? (before.sentAt ?? new Date()) : before.sentAt,
      acceptedAt: status === "accepted" ? (before.acceptedAt ?? new Date()) : before.acceptedAt,
    },
  });

  await audit({
    actorId,
    action: "status_change",
    entityType: "Proposal",
    entityId: id,
    before: { status: before.status },
    after: { status },
  });
  return proposal;
}

/**
 * Crea la siguiente versión a partir de una propuesta existente. La anterior
 * queda archivada para conservar el histórico de lo que se llegó a enviar.
 */
export async function createProposalVersion(actorId: string, id: string) {
  const source = await prisma.proposal.findFirst({ where: { id, ...notDeleted } });
  if (!source) throw new Error("NOT_FOUND");

  const next = await prisma.$transaction(async (tx) => {
    await tx.proposal.update({ where: { id }, data: { status: "archived" } });
    return tx.proposal.create({
      data: {
        title: source.title,
        status: "draft",
        version: source.version + 1,
        leadId: source.leadId,
        clientId: source.clientId,
        opportunityId: source.opportunityId,
        amountNet: source.amountNet,
        vatRate: source.vatRate,
        amountTotal: source.amountTotal,
        currency: source.currency,
        validUntil: source.validUntil,
        conditions: source.conditions,
        notes: source.notes,
      },
    });
  });

  await audit({
    actorId,
    action: "create",
    entityType: "Proposal",
    entityId: next.id,
    metadata: { versionOf: id, version: next.version },
  });
  return next;
}

export async function softDeleteProposal(actorId: string, id: string) {
  const proposal = await prisma.proposal.findFirst({ where: { id, ...notDeleted } });
  if (!proposal) throw new Error("NOT_FOUND");

  await prisma.proposal.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "Proposal",
    entityId: id,
    before: { title: proposal.title, status: proposal.status },
  });
}
