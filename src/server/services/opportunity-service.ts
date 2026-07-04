import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { OPEN_STAGES } from "@/server/validators/opportunity";
import type {
  OpportunityCreateInput,
  OpportunityUpdateInput,
  StageChangeInput,
} from "@/server/validators/opportunity";
import type { OpportunityStage, Prisma } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

const listInclude = {
  lead: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
} satisfies Prisma.OpportunityInclude;

export async function listOpportunities(opts: { includeClosed?: boolean } = {}) {
  return prisma.opportunity.findMany({
    where: {
      ...notDeleted,
      ...(opts.includeClosed
        ? {}
        : { stage: { in: [...OPEN_STAGES, "paused"] } }),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
    include: listInclude,
  });
}

export async function getOpportunity(id: string) {
  return prisma.opportunity.findFirst({
    where: { id, ...notDeleted },
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true } },
      client: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      proposals: {
        where: notDeleted,
        select: { id: true, title: true, status: true, amountTotal: true },
      },
      tasks: {
        where: { deletedAt: null, status: { in: ["todo", "in_progress", "waiting"] } },
        orderBy: { dueAt: "asc" },
      },
      interactions: { where: notDeleted, orderBy: { occurredAt: "desc" }, take: 30 },
      notes: { where: notDeleted, orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function createOpportunity(
  actorId: string,
  input: OpportunityCreateInput,
) {
  const opportunity = await prisma.opportunity.create({
    data: {
      ...input,
      probability: input.probability ?? 30,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      serviceId: input.serviceId || null,
      campaignId: input.campaignId || null,
      urgencyLevel: input.urgencyLevel ?? null,
      kairasFit: input.kairasFit ?? null,
    },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Opportunity",
    entityId: opportunity.id,
    after: {
      title: opportunity.title,
      stage: opportunity.stage,
      estimatedValue: opportunity.estimatedValue?.toString() ?? null,
    },
  });
  return opportunity;
}

export async function updateOpportunity(
  actorId: string,
  id: string,
  input: OpportunityUpdateInput,
) {
  const before = await prisma.opportunity.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...input,
      leadId: input.leadId === undefined ? undefined : input.leadId || null,
      clientId: input.clientId === undefined ? undefined : input.clientId || null,
      serviceId: input.serviceId === undefined ? undefined : input.serviceId || null,
      campaignId:
        input.campaignId === undefined ? undefined : input.campaignId || null,
    },
  });
  await audit({
    actorId,
    action: "update",
    entityType: "Opportunity",
    entityId: id,
    before: { stage: before.stage },
    after: { stage: opportunity.stage },
  });
  return opportunity;
}

/**
 * Cambia la etapa. Efectos colaterales:
 * - won: fija acceptedValue (o usa el estimado) y marca el lead como ganado.
 * - lost: guarda motivo; si el lead no tiene otras oportunidades abiertas,
 *   lo marca como perdido.
 */
export async function changeOpportunityStage(
  actorId: string,
  id: string,
  input: StageChangeInput,
) {
  const before = await prisma.opportunity.findFirst({
    where: { id, ...notDeleted },
  });
  if (!before) throw new Error("NOT_FOUND");
  if (before.stage === input.stage) return before;

  const data: Prisma.OpportunityUpdateInput = { stage: input.stage };
  if (input.stage === "won") {
    data.acceptedValue =
      input.acceptedValue ?? before.acceptedValue ?? before.estimatedValue;
    data.probability = 100;
  }
  if (input.stage === "lost") {
    data.lostReason = input.lostReason ?? before.lostReason;
    data.probability = 0;
  }

  const opportunity = await prisma.opportunity.update({ where: { id }, data });

  // Sincroniza el estado del lead asociado
  if (before.leadId) {
    if (input.stage === "won") {
      await prisma.lead.update({
        where: { id: before.leadId },
        data: { status: "won" },
      });
    } else if (input.stage === "lost") {
      const otherOpen = await prisma.opportunity.count({
        where: {
          leadId: before.leadId,
          id: { not: id },
          deletedAt: null,
          stage: { in: [...OPEN_STAGES] },
        },
      });
      if (otherOpen === 0) {
        await prisma.lead.update({
          where: { id: before.leadId },
          data: { status: "lost", lostReason: input.lostReason ?? undefined },
        });
      }
    }
  }

  await audit({
    actorId,
    action: "status_change",
    entityType: "Opportunity",
    entityId: id,
    before: { stage: before.stage },
    after: {
      stage: input.stage,
      lostReason: input.lostReason ?? null,
      acceptedValue: data.acceptedValue?.toString() ?? null,
    },
  });
  return opportunity;
}

export async function softDeleteOpportunity(actorId: string, id: string) {
  const opp = await prisma.opportunity.findFirst({ where: { id, ...notDeleted } });
  if (!opp) throw new Error("NOT_FOUND");
  await prisma.opportunity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await audit({
    actorId,
    action: "delete",
    entityType: "Opportunity",
    entityId: id,
    before: { title: opp.title, stage: opp.stage },
  });
}

export async function getPipelineMetrics() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [open, wonMonth, lostMonth, wonAll, lostAll] = await Promise.all([
    prisma.opportunity.findMany({
      where: { ...notDeleted, stage: { in: [...OPEN_STAGES] } },
      select: { estimatedValue: true, probability: true, nextAction: true },
    }),
    prisma.opportunity.aggregate({
      where: { ...notDeleted, stage: "won", updatedAt: { gte: startOfMonth } },
      _count: true,
      _sum: { acceptedValue: true },
    }),
    prisma.opportunity.count({
      where: { ...notDeleted, stage: "lost", updatedAt: { gte: startOfMonth } },
    }),
    prisma.opportunity.count({ where: { ...notDeleted, stage: "won" } }),
    prisma.opportunity.count({ where: { ...notDeleted, stage: "lost" } }),
  ]);

  let openValue = 0;
  let weightedValue = 0;
  let withoutNextAction = 0;
  for (const o of open) {
    const v = o.estimatedValue ? Number(o.estimatedValue) : 0;
    openValue += v;
    weightedValue += (v * (o.probability ?? 0)) / 100;
    if (!o.nextAction) withoutNextAction += 1;
  }

  const closedAll = wonAll + lostAll;
  return {
    openCount: open.length,
    openValue,
    weightedValue,
    withoutNextAction,
    wonMonthCount: wonMonth._count,
    wonMonthValue: Number(wonMonth._sum.acceptedValue ?? 0),
    lostMonthCount: lostMonth,
    winRate: closedAll > 0 ? Math.round((wonAll / closedAll) * 100) : null,
  };
}
