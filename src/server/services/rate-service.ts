import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export type ResolvedRate = {
  rate: number;
  currency: string;
  source: "project" | "client" | "service" | "global" | "none";
};

function validityFilter(now: Date): Prisma.HourlyRateWhereInput {
  return {
    active: true,
    OR: [{ validFrom: null }, { validFrom: { lte: now } }],
    AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] }],
  };
}

/**
 * Resuelve la tarifa horaria efectiva con prioridad:
 * proyecto > cliente > servicio > global.
 */
export async function resolveHourlyRate(params: {
  projectId?: string | null;
  clientId?: string | null;
  serviceId?: string | null;
  at?: Date;
}): Promise<ResolvedRate> {
  const now = params.at ?? new Date();
  const validity = validityFilter(now);

  if (params.projectId) {
    const r = await prisma.hourlyRate.findFirst({
      where: { scope: "project", projectId: params.projectId, ...validity },
      orderBy: { createdAt: "desc" },
    });
    if (r) return { rate: Number(r.rate), currency: r.currency, source: "project" };
  }
  if (params.clientId) {
    const r = await prisma.hourlyRate.findFirst({
      where: { scope: "client", clientId: params.clientId, ...validity },
      orderBy: { createdAt: "desc" },
    });
    if (r) return { rate: Number(r.rate), currency: r.currency, source: "client" };
  }
  if (params.serviceId) {
    const r = await prisma.hourlyRate.findFirst({
      where: { scope: "service", serviceId: params.serviceId, ...validity },
      orderBy: { createdAt: "desc" },
    });
    if (r) return { rate: Number(r.rate), currency: r.currency, source: "service" };
  }
  const global = await prisma.hourlyRate.findFirst({
    where: { scope: "global", ...validity },
    orderBy: { createdAt: "desc" },
  });
  if (global) {
    return { rate: Number(global.rate), currency: global.currency, source: "global" };
  }
  return { rate: 0, currency: "EUR", source: "none" };
}

export async function listRates() {
  return prisma.hourlyRate.findMany({
    orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
    include: {
      client: { select: { name: true } },
      project: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
}
