import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type { CampaignInput } from "@/server/validators/campaign";
import type { Prisma, CampaignStatus } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

export type CampaignFilters = {
  status?: string;
};

/**
 * Listado con atribución. Las ventas se cuentan por las oportunidades ganadas
 * que cuelgan de la campaña, no por los leads: un lead sin cerrar no es venta.
 *
 * Son tres consultas fijas (campañas + ganadas + totales), no una por campaña:
 * agrupar en Postgres evita el N+1 clásico de recorrer el listado.
 */
export async function listCampaigns(filters: CampaignFilters = {}) {
  const where: Prisma.CampaignWhereInput = {
    ...notDeleted,
    ...(filters.status ? { status: filters.status as CampaignStatus } : {}),
  };

  const [campaigns, wonByCampaign] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: [{ status: "asc" }, { startAt: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { leads: true, opportunities: true } },
      },
    }),
    prisma.opportunity.groupBy({
      by: ["campaignId"],
      where: { ...notDeleted, stage: "won", campaignId: { not: null } },
      _count: { _all: true },
      _sum: { acceptedValue: true },
    }),
  ]);

  const wonMap = new Map(
    wonByCampaign.map((row) => [
      row.campaignId,
      {
        count: row._count._all,
        value: Number(row._sum.acceptedValue ?? 0),
      },
    ]),
  );

  const rows = campaigns.map((c) => {
    const won = wonMap.get(c.id) ?? { count: 0, value: 0 };
    const spent = Number(c.spent ?? 0);
    const budget = Number(c.budget ?? 0);
    const leads = c._count.leads;

    // Si no hay gasto registrado, el coste por lead se toma del valor manual
    // (útil en canales sin inversión directa, como recomendaciones).
    const costPerLead =
      spent > 0 && leads > 0
        ? spent / leads
        : c.manualCostPerLead !== null
          ? Number(c.manualCostPerLead)
          : null;

    return {
      ...c,
      leadsCount: leads,
      opportunitiesCount: c._count.opportunities,
      wonCount: won.count,
      wonValue: won.value,
      spentAmount: spent,
      budgetAmount: budget,
      costPerLead,
      // ROAS solo tiene sentido con inversión: sin gasto, dividir es engañoso.
      roas: spent > 0 ? won.value / spent : null,
      budgetUsedPct: budget > 0 ? Math.round((spent / budget) * 100) : null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      spent: acc.spent + r.spentAmount,
      budget: acc.budget + r.budgetAmount,
      leads: acc.leads + r.leadsCount,
      won: acc.won + r.wonValue,
      activeCount: acc.activeCount + (r.status === "active" ? 1 : 0),
    }),
    { spent: 0, budget: 0, leads: 0, won: 0, activeCount: 0 },
  );

  return {
    campaigns: rows,
    stats: {
      ...totals,
      costPerLead: totals.leads > 0 && totals.spent > 0 ? totals.spent / totals.leads : null,
      roas: totals.spent > 0 ? totals.won / totals.spent : null,
    },
  };
}

export async function getCampaign(id: string) {
  return prisma.campaign.findFirst({
    where: { id, ...notDeleted },
    include: {
      leads: {
        where: notDeleted,
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, name: true, status: true, temperature: true, createdAt: true },
      },
      opportunities: {
        where: notDeleted,
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          stage: true,
          estimatedValue: true,
          acceptedValue: true,
        },
      },
    },
  });
}

function dataFrom(input: CampaignInput) {
  return {
    name: input.name,
    channel: input.channel,
    status: input.status,
    objective: input.objective ?? null,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    budget: input.budget ?? null,
    spent: input.spent ?? null,
    manualCostPerLead: input.manualCostPerLead ?? null,
    promotedService: input.promotedService ?? null,
    url: input.url ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmContent: input.utmContent ?? null,
    notes: input.notes ?? null,
  };
}

export async function createCampaign(actorId: string, input: CampaignInput) {
  const campaign = await prisma.campaign.create({ data: dataFrom(input) });
  await audit({
    actorId,
    action: "create",
    entityType: "Campaign",
    entityId: campaign.id,
    after: { name: campaign.name, channel: campaign.channel, status: campaign.status },
  });
  return campaign;
}

export async function updateCampaign(
  actorId: string,
  id: string,
  input: CampaignInput,
) {
  const before = await prisma.campaign.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const campaign = await prisma.campaign.update({
    where: { id },
    data: dataFrom(input),
  });
  await audit({
    actorId,
    action: "update",
    entityType: "Campaign",
    entityId: id,
    before: { status: before.status, spent: before.spent?.toString() ?? null },
    after: { status: campaign.status, spent: campaign.spent?.toString() ?? null },
  });
  return campaign;
}

export async function softDeleteCampaign(actorId: string, id: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, ...notDeleted } });
  if (!campaign) throw new Error("NOT_FOUND");

  await prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    actorId,
    action: "delete",
    entityType: "Campaign",
    entityId: id,
    before: { name: campaign.name },
  });
}
