import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import type { EventCreateInput } from "@/server/validators/calendar";

export const CALENDAR_LAYERS = [
  "events", // reuniones, llamadas, recordatorios (CalendarEvent)
  "tasks", // tareas con fecha límite
  "deadlines", // entregas de proyecto
  "followups", // seguimientos comerciales (leads)
  "opportunities", // cierres previstos
  "time", // horas trabajadas
] as const;
export type CalendarLayer = (typeof CALENDAR_LAYERS)[number];

export type CalendarItem = {
  id: string;
  layer: CalendarLayer;
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  href: string;
  subtitle: string | null;
  durationSeconds?: number;
};

export async function getCalendarItems(
  userId: string,
  from: Date,
  to: Date,
  layers: CalendarLayer[],
): Promise<CalendarItem[]> {
  const items: CalendarItem[] = [];
  const want = new Set(layers);

  const [events, tasks, projects, opportunities, leads, timeEntries] =
    await Promise.all([
      want.has("events")
        ? prisma.calendarEvent.findMany({
            where: {
              deletedAt: null,
              status: { in: ["scheduled", "confirmed"] },
              startAt: { gte: from, lte: to },
            },
            include: {
              client: { select: { name: true } },
              lead: { select: { name: true } },
              project: { select: { name: true } },
            },
          })
        : [],
      want.has("tasks")
        ? prisma.task.findMany({
            where: {
              deletedAt: null,
              status: { in: ["todo", "in_progress", "waiting"] },
              dueAt: { gte: from, lte: to },
            },
            include: { project: { select: { name: true } } },
          })
        : [],
      want.has("deadlines")
        ? prisma.project.findMany({
            where: {
              deletedAt: null,
              status: { notIn: ["completed", "cancelled"] },
              deadline: { gte: from, lte: to },
            },
            include: { client: { select: { name: true } } },
          })
        : [],
      want.has("opportunities")
        ? prisma.opportunity.findMany({
            where: {
              deletedAt: null,
              stage: {
                in: [
                  "discovered",
                  "qualified",
                  "diagnosis",
                  "proposal_drafting",
                  "proposal_sent",
                  "follow_up",
                  "negotiation",
                  "accepted",
                ],
              },
              expectedCloseAt: { gte: from, lte: to },
            },
            include: { lead: { select: { name: true } }, client: { select: { name: true } } },
          })
        : [],
      want.has("followups")
        ? prisma.lead.findMany({
            where: {
              deletedAt: null,
              status: {
                notIn: ["won", "lost", "do_not_contact", "client_active", "client_inactive"],
              },
              nextActionAt: { gte: from, lte: to },
            },
          })
        : [],
      want.has("time")
        ? prisma.timeEntry.findMany({
            where: {
              userId,
              deletedAt: null,
              startedAt: { gte: from, lte: to },
            },
            include: {
              client: { select: { name: true } },
              project: { select: { name: true } },
            },
          })
        : [],
    ]);

  for (const e of events) {
    items.push({
      id: `event-${e.id}`,
      layer: "events",
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay,
      href: `/calendar/event/${e.id}`,
      subtitle:
        e.client?.name ?? e.lead?.name ?? e.project?.name ?? e.location ?? null,
    });
  }
  for (const t of tasks) {
    items.push({
      id: `task-${t.id}`,
      layer: "tasks",
      title: t.title,
      startAt: t.dueAt!,
      endAt: null,
      allDay: false,
      href: `/tasks/${t.id}`,
      subtitle: t.project?.name ?? null,
    });
  }
  for (const p of projects) {
    items.push({
      id: `deadline-${p.id}`,
      layer: "deadlines",
      title: `Entrega: ${p.name}`,
      startAt: p.deadline!,
      endAt: null,
      allDay: true,
      href: `/projects/${p.id}`,
      subtitle: p.client.name,
    });
  }
  for (const o of opportunities) {
    items.push({
      id: `opp-${o.id}`,
      layer: "opportunities",
      title: `Cierre: ${o.title}`,
      startAt: o.expectedCloseAt!,
      endAt: null,
      allDay: true,
      href: `/pipeline/${o.id}`,
      subtitle: o.client?.name ?? o.lead?.name ?? null,
    });
  }
  for (const l of leads) {
    items.push({
      id: `lead-${l.id}`,
      layer: "followups",
      title: l.nextAction ? `${l.name}: ${l.nextAction}` : `Seguimiento: ${l.name}`,
      startAt: l.nextActionAt!,
      endAt: null,
      allDay: false,
      href: `/leads/${l.id}`,
      subtitle: null,
    });
  }
  for (const te of timeEntries) {
    items.push({
      id: `time-${te.id}`,
      layer: "time",
      title: te.title || "Trabajo registrado",
      startAt: te.startedAt,
      endAt: te.endedAt,
      allDay: false,
      href: `/time/${te.id}`,
      subtitle: te.project?.name ?? te.client?.name ?? null,
      durationSeconds: te.durationSeconds,
    });
  }

  items.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return items;
}

export async function createEvent(actorId: string, input: EventCreateInput) {
  const event = await prisma.calendarEvent.create({
    data: {
      title: input.title,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      allDay: input.allDay,
      description: input.description,
      location: input.location,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
    },
  });
  await audit({
    actorId,
    action: "create",
    entityType: "CalendarEvent",
    entityId: event.id,
    after: { title: event.title, startAt: event.startAt.toISOString() },
  });
  return event;
}

export async function updateEvent(
  actorId: string,
  id: string,
  input: EventCreateInput,
) {
  const before = await prisma.calendarEvent.findFirst({
    where: { id, deletedAt: null },
  });
  if (!before) throw new Error("NOT_FOUND");

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: input.title,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt ?? null,
      allDay: input.allDay,
      description: input.description ?? null,
      location: input.location ?? null,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
    },
  });
  await audit({
    actorId,
    action: "update",
    entityType: "CalendarEvent",
    entityId: id,
  });
  return event;
}

export async function deleteEvent(actorId: string, id: string) {
  const event = await prisma.calendarEvent.findFirst({
    where: { id, deletedAt: null },
  });
  if (!event) throw new Error("NOT_FOUND");
  await prisma.calendarEvent.update({
    where: { id },
    data: { deletedAt: new Date(), status: "cancelled" },
  });
  await audit({
    actorId,
    action: "delete",
    entityType: "CalendarEvent",
    entityId: id,
    before: { title: event.title },
  });
}
