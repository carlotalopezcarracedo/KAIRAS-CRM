import { prisma } from "@/server/db/prisma";
import { resolveHourlyRate } from "@/server/services/rate-service";

const notDeleted = { deletedAt: null } as const;

const OPEN_STAGES = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
] as const;

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

export async function getReports(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 86_400_000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    openOpps,
    wonMonth,
    lostMonth,
    wonAll,
    lostAll,
    activeRecurring,
    timeEntries8w,
    projectsWithHours,
    paidInvoicesByClient,
    overdueTasks,
    leadsBySource,
    totalLeads,
    leadsWithOpp,
    clientsFromLeads,
  ] = await Promise.all([
    prisma.opportunity.findMany({
      where: { ...notDeleted, stage: { in: [...OPEN_STAGES] } },
      select: { estimatedValue: true, probability: true, expectedCloseAt: true },
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
    prisma.recurringService.findMany({
      where: { ...notDeleted, status: "active" },
      select: { amount: true, periodicity: true },
    }),
    prisma.timeEntry.findMany({
      where: { userId, ...notDeleted, startedAt: { gte: eightWeeksAgo } },
      select: {
        startedAt: true,
        durationSeconds: true,
        billable: true,
        calculatedAmount: true,
      },
    }),
    prisma.timeEntry.groupBy({
      by: ["projectId"],
      where: { ...notDeleted, projectId: { not: null } },
      _sum: { durationSeconds: true, calculatedAmount: true },
      orderBy: { _sum: { durationSeconds: "desc" } },
      take: 10,
    }),
    prisma.invoiceRecord.groupBy({
      by: ["clientId"],
      where: { ...notDeleted, status: "paid", clientId: { not: null } },
      _sum: { amountTotal: true },
      orderBy: { _sum: { amountTotal: "desc" } },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        ...notDeleted,
        status: { in: ["todo", "in_progress", "waiting"] },
        dueAt: { lt: startOfToday },
      },
      orderBy: { dueAt: "asc" },
      take: 10,
      select: { id: true, title: true, dueAt: true },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { ...notDeleted, createdAt: { gte: ninetyDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
    }),
    prisma.lead.count({ where: notDeleted }),
    prisma.lead.count({
      where: { ...notDeleted, opportunities: { some: { deletedAt: null } } },
    }),
    prisma.lead.count({ where: { ...notDeleted, clientId: { not: null } } }),
  ]);

  // Pipeline
  let openValue = 0;
  let weightedValue = 0;
  for (const o of openOpps) {
    const v = o.estimatedValue ? Number(o.estimatedValue) : 0;
    openValue += v;
    weightedValue += (v * (o.probability ?? 0)) / 100;
  }

  const mrr = activeRecurring.reduce(
    (acc, r) => acc + monthlyEquivalent(Number(r.amount), r.periodicity),
    0,
  );

  // Horas por semana (8 semanas, lunes como inicio)
  const weeks = new Map<
    string,
    { label: string; seconds: number; billableSeconds: number; amount: number }
  >();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 86_400_000);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    weeks.set(key, {
      label: `${monday.getDate()}/${monday.getMonth() + 1}`,
      seconds: 0,
      billableSeconds: 0,
      amount: 0,
    });
  }
  for (const e of timeEntries8w) {
    const d = e.startedAt;
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    const week = weeks.get(key);
    if (!week) continue;
    week.seconds += e.durationSeconds;
    if (e.billable) {
      week.billableSeconds += e.durationSeconds;
      week.amount += Number(e.calculatedAmount ?? 0);
    }
  }

  // Rentabilidad por proyecto
  const projectIds = projectsWithHours
    .map((p) => p.projectId)
    .filter((id): id is string => !!id);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      name: true,
      budget: true,
      clientId: true,
      mainServiceId: true,
      client: { select: { name: true } },
    },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const projectProfitability = await Promise.all(
    projectsWithHours.map(async (row) => {
      const project = row.projectId ? projectMap.get(row.projectId) : null;
      if (!project) return null;
      const seconds = row._sum.durationSeconds ?? 0;
      const rate = await resolveHourlyRate({
        projectId: project.id,
        clientId: project.clientId,
        serviceId: project.mainServiceId,
      });
      const hoursCost = (seconds / 3600) * rate.rate;
      const budget = project.budget ? Number(project.budget) : null;
      return {
        id: project.id,
        name: project.name,
        clientName: project.client.name,
        seconds,
        hoursCost,
        budget,
        profitability:
          budget !== null && budget > 0
            ? Math.round(((budget - hoursCost) / budget) * 100)
            : null,
      };
    }),
  );

  // Ranking clientes por ingresos cobrados
  const clientIds = paidInvoicesByClient
    .map((r) => r.clientId)
    .filter((id): id is string => !!id);
  const clientNames = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  });
  const clientNameMap = new Map(clientNames.map((c) => [c.id, c.name]));

  const closedAll = wonAll + lostAll;

  return {
    pipeline: {
      openCount: openOpps.length,
      openValue,
      weightedValue,
    },
    sales: {
      wonMonthCount: wonMonth._count,
      wonMonthValue: Number(wonMonth._sum.acceptedValue ?? 0),
      lostMonthCount: lostMonth,
      wonAll,
      lostAll,
      winRate: closedAll > 0 ? Math.round((wonAll / closedAll) * 100) : null,
    },
    mrr,
    weeklyHours: [...weeks.values()],
    projectProfitability: projectProfitability.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    ),
    clientRevenue: paidInvoicesByClient.map((r) => ({
      id: r.clientId!,
      name: clientNameMap.get(r.clientId!) ?? "—",
      total: Number(r._sum.amountTotal ?? 0),
    })),
    overdueTasks,
    leadsBySource: leadsBySource.map((r) => ({
      source: r.source,
      count: r._count._all,
    })),
    funnel: {
      totalLeads,
      leadsWithOpp,
      clientsFromLeads,
      leadToOppRate:
        totalLeads > 0 ? Math.round((leadsWithOpp / totalLeads) * 100) : 0,
      leadToClientRate:
        totalLeads > 0 ? Math.round((clientsFromLeads / totalLeads) * 100) : 0,
    },
  };
}
