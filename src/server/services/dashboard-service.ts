import { prisma } from "@/server/db/prisma";

const ACTIVE_LEAD_STATUSES = [
  "new",
  "contacted",
  "responded",
  "interested",
  "meeting_scheduled",
  "diagnosis_done",
  "proposal_needed",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "nurture",
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

const ACTIVE_PROJECT_STATUSES = [
  "discovery",
  "planning",
  "design",
  "development",
  "review",
  "delivery",
  "support",
  "blocked",
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

export async function getDashboardData() {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    leadsNew7d,
    followUps,
    hotLeadsCount,
    openOpportunities,
    proposalsPending,
    activeProjectsCount,
    overdueTasks,
    todayTasks,
    todayEvents,
    activeRecurring,
    invoiceDraftsPending,
    invoicesPendingPayment,
    leadsBySource30d,
  ] = await Promise.all([
    prisma.lead.count({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
    }),
    // Seguimientos: leads activos con siguiente acción vencida o para hoy
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
        nextActionAt: { lte: endOfToday },
      },
      orderBy: { nextActionAt: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        phone: true,
        nextAction: true,
        nextActionAt: true,
        temperature: true,
        status: true,
      },
    }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        temperature: { in: ["hot", "urgent"] },
        status: { in: [...ACTIVE_LEAD_STATUSES] },
      },
    }),
    prisma.opportunity.findMany({
      where: { deletedAt: null, stage: { in: [...OPEN_OPPORTUNITY_STAGES] } },
      select: {
        id: true,
        stage: true,
        estimatedValue: true,
        probability: true,
        expectedCloseAt: true,
      },
    }),
    prisma.proposal.count({
      where: {
        deletedAt: null,
        status: { in: ["sent", "viewed", "followed_up"] },
      },
    }),
    prisma.project.count({
      where: { deletedAt: null, status: { in: [...ACTIVE_PROJECT_STATUSES] } },
    }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: ["todo", "in_progress", "waiting"] },
        dueAt: { lt: startOfToday },
      },
      orderBy: { dueAt: "asc" },
      take: 6,
      select: { id: true, title: true, dueAt: true, priority: true },
    }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: ["todo", "in_progress", "waiting"] },
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { dueAt: "asc" },
      take: 8,
      select: { id: true, title: true, dueAt: true, priority: true, type: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        deletedAt: null,
        status: { in: ["scheduled", "confirmed"] },
        startAt: { gte: startOfToday, lte: endOfToday },
      },
      orderBy: { startAt: "asc" },
      take: 8,
      select: { id: true, title: true, startAt: true, endAt: true, type: true },
    }),
    prisma.recurringService.findMany({
      where: { deletedAt: null, status: "active" },
      select: { amount: true, periodicity: true },
    }),
    prisma.invoiceDraftRequest.count({
      where: { deletedAt: null, status: { in: ["pending", "queued"] } },
    }),
    prisma.invoiceRecord.aggregate({
      where: {
        deletedAt: null,
        status: { in: ["created_in_odoo", "sent", "overdue"] },
      },
      _count: true,
      _sum: { amountTotal: true },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
    }),
  ]);

  // Pipeline
  let pipelineOpen = 0;
  let pipelineWeighted = 0;
  let expectedThisMonth = 0;
  const byStage = new Map<string, { count: number; value: number }>();
  for (const opp of openOpportunities) {
    const value = opp.estimatedValue ? Number(opp.estimatedValue) : 0;
    pipelineOpen += value;
    pipelineWeighted += (value * (opp.probability ?? 0)) / 100;
    if (
      opp.expectedCloseAt &&
      opp.expectedCloseAt >= startOfMonth &&
      opp.expectedCloseAt <= endOfMonth
    ) {
      expectedThisMonth += (value * (opp.probability ?? 0)) / 100;
    }
    const entry = byStage.get(opp.stage) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += value;
    byStage.set(opp.stage, entry);
  }

  const mrr = activeRecurring.reduce(
    (acc, r) => acc + monthlyEquivalent(Number(r.amount), r.periodicity),
    0,
  );

  return {
    leadsNew7d,
    followUps,
    followUpsOverdueCount: followUps.filter(
      (f) => f.nextActionAt && f.nextActionAt < startOfToday,
    ).length,
    hotLeadsCount,
    pipelineOpen,
    pipelineWeighted,
    expectedThisMonth,
    openOpportunitiesCount: openOpportunities.length,
    byStage,
    proposalsPending,
    activeProjectsCount,
    overdueTasks,
    todayTasks,
    todayEvents,
    mrr,
    activeRecurringCount: activeRecurring.length,
    invoiceDraftsPending,
    invoicesPendingPaymentCount: invoicesPendingPayment._count,
    invoicesPendingPaymentSum: Number(
      invoicesPendingPayment._sum.amountTotal ?? 0,
    ),
    leadsBySource30d: leadsBySource30d.map((row) => ({
      source: row.source,
      count: row._count._all,
    })),
  };
}
