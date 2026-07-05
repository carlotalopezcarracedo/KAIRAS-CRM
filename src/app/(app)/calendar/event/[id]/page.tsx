import type { Metadata } from "next";
import { toDateTimeLocalInput } from "@/lib/dates";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { prisma } from "@/server/db/prisma";
import { EventForm, type EventFormDefaults, type EventSelectData } from "../../event-form";
import { updateEventAction, deleteEventAction } from "../../actions";

export const metadata: Metadata = { title: "Evento" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, leads, clients, projects] = await Promise.all([
    prisma.calendarEvent.findFirst({ where: { id, deletedAt: null } }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!event) notFound();

  const selects: EventSelectData = { leads, clients, projects };
  const defaults: EventFormDefaults = {
    title: event.title,
    type: event.type,
    startAt: toDateTimeLocalInput(event.startAt),
    endAt: toDateTimeLocalInput(event.endAt),
    allDay: event.allDay,
    description: event.description ?? "",
    location: event.location ?? "",
    leadId: event.leadId ?? "",
    clientId: event.clientId ?? "",
    projectId: event.projectId ?? "",
  };

  return (
    <div>
      <Link
        href="/calendar"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Calendario
      </Link>

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foam">
          {event.title}
        </h1>
        <ConfirmDelete
          action={deleteEventAction.bind(null, event.id)}
          title="Eliminar evento"
          description={`"${event.title}" se eliminará del calendario.`}
        />
      </div>

      <Card className="max-w-2xl">
        <CardBody>
          <EventForm
            action={updateEventAction.bind(null, event.id)}
            defaults={defaults}
            selects={selects}
            submitLabel="Guardar cambios"
          />
        </CardBody>
      </Card>
    </div>
  );
}
