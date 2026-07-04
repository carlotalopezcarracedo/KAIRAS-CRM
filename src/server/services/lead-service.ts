import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { recordInternalEvent } from "@/integrations/meta/conversions-api";
import type {
  LeadCreateInput,
  LeadUpdateInput,
  LeadFilters,
  InteractionCreateInput,
  NoteCreateInput,
} from "@/server/validators/lead";
import type { LeadStatus, Prisma } from "@prisma/client";

const notDeleted = { deletedAt: null } as const;

export async function listLeads(filters: LeadFilters) {
  const where: Prisma.LeadWhereInput = { ...notDeleted };

  if (filters.status) where.status = filters.status;
  if (filters.temperature) where.temperature = filters.temperature;
  if (filters.source) where.source = filters.source;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { contact: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q, mode: "insensitive" } },
      { instagram: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { sector: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return prisma.lead.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: {
      service: { select: { name: true } },
      campaign: { select: { name: true } },
      _count: { select: { interactions: true, opportunities: true } },
    },
  });
}

export async function getLead(id: string) {
  return prisma.lead.findFirst({
    where: { id, ...notDeleted },
    include: {
      service: true,
      campaign: true,
      client: { select: { id: true, name: true } },
      opportunities: {
        where: notDeleted,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, stage: true, estimatedValue: true },
      },
      interactions: {
        where: notDeleted,
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
      notes: {
        where: notDeleted,
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      tasks: {
        where: { deletedAt: null, status: { in: ["todo", "in_progress", "waiting"] } },
        orderBy: { dueAt: "asc" },
        take: 20,
      },
    },
  });
}

export async function createLead(actorId: string, input: LeadCreateInput) {
  const lead = await prisma.lead.create({
    data: {
      ...input,
      serviceId: input.serviceId || null,
      campaignId: input.campaignId || null,
      firstContactAt: input.status !== "new" ? new Date() : null,
    },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Lead",
    entityId: lead.id,
    after: { name: lead.name, status: lead.status, source: lead.source },
  });
  await recordInternalEvent({ event: "lead_created", leadId: lead.id });
  return lead;
}

export async function updateLead(
  actorId: string,
  id: string,
  input: LeadUpdateInput,
) {
  const before = await prisma.lead.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...input,
      serviceId: input.serviceId === undefined ? undefined : input.serviceId || null,
      campaignId:
        input.campaignId === undefined ? undefined : input.campaignId || null,
    },
  });
  await audit({
    actorId,
    action: "update",
    entityType: "Lead",
    entityId: id,
    before: { status: before.status, temperature: before.temperature },
    after: { status: lead.status, temperature: lead.temperature },
  });
  return lead;
}

export async function changeLeadStatus(
  actorId: string,
  id: string,
  status: LeadStatus,
  lostReason?: string,
) {
  const before = await prisma.lead.findFirst({ where: { id, ...notDeleted } });
  if (!before) throw new Error("NOT_FOUND");

  const data: Prisma.LeadUpdateInput = { status };
  if (status === "lost" && lostReason) data.lostReason = lostReason;
  if (status === "contacted" && !before.firstContactAt) {
    data.firstContactAt = new Date();
  }
  if (before.status === "new" && status !== "new") {
    data.lastContactAt = new Date();
  }

  const lead = await prisma.lead.update({ where: { id }, data });
  await audit({
    actorId,
    action: "status_change",
    entityType: "Lead",
    entityId: id,
    before: { status: before.status },
    after: { status, lostReason: lostReason ?? null },
  });

  // Eventos de conversión hacia Meta (solo se registran; el envío es aparte)
  if (before.status !== status) {
    if (status === "contacted") {
      await recordInternalEvent({ event: "lead_contacted", leadId: id });
    } else if (status === "meeting_scheduled") {
      await recordInternalEvent({ event: "meeting_scheduled", leadId: id });
    } else if (status === "diagnosis_done") {
      await recordInternalEvent({ event: "diagnosis_done", leadId: id });
    } else if (status === "proposal_sent") {
      await recordInternalEvent({ event: "proposal_sent", leadId: id });
    }
  }
  return lead;
}

export async function softDeleteLead(actorId: string, id: string) {
  const lead = await prisma.lead.findFirst({ where: { id, ...notDeleted } });
  if (!lead) throw new Error("NOT_FOUND");
  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await audit({
    actorId,
    action: "delete",
    entityType: "Lead",
    entityId: id,
    before: { name: lead.name, status: lead.status },
  });
}

export async function addLeadInteraction(
  actorId: string,
  leadId: string,
  input: InteractionCreateInput,
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, ...notDeleted } });
  if (!lead) throw new Error("NOT_FOUND");

  const interaction = await prisma.interaction.create({
    data: {
      leadId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      detail: input.detail,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

  // Actualiza seguimiento del lead
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactAt: interaction.occurredAt,
      firstContactAt: lead.firstContactAt ?? interaction.occurredAt,
      ...(input.nextAction !== undefined ? { nextAction: input.nextAction } : {}),
      ...(input.nextActionAt !== undefined
        ? { nextActionAt: input.nextActionAt }
        : {}),
    },
  });

  await audit({
    actorId,
    action: "create",
    entityType: "Interaction",
    entityId: interaction.id,
    metadata: { leadId, channel: input.channel },
  });
  return interaction;
}

export async function addLeadNote(
  actorId: string,
  leadId: string,
  input: NoteCreateInput,
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, ...notDeleted } });
  if (!lead) throw new Error("NOT_FOUND");

  const note = await prisma.note.create({
    data: { leadId, title: input.title, content: input.content },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "Note",
    entityId: note.id,
    metadata: { leadId },
  });
  return note;
}
