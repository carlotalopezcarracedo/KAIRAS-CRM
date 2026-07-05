import type { Metadata } from "next";
import { toDateTimeLocalInput } from "@/lib/dates";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/confirm-delete";
import { TIME_ENTRY_STATUS } from "@/lib/labels";
import { formatDuration, formatMoney } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { EntryForm, type EntryFormDefaults, type EntrySelectData } from "../entry-form";
import { EntryStatusControl } from "./entry-status-control";
import { updateEntryAction, deleteEntryAction } from "../actions";

export const metadata: Metadata = { title: "Entrada de tiempo" };

export default async function TimeEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [entry, clients, projects, services, tasks] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
      },
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
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true },
    }),
  ]);
  if (!entry) notFound();

  const locked =
    !!entry.lockedAt || ["queued_for_invoice", "invoiced"].includes(entry.status);

  const selects: EntrySelectData = { clients, projects, services, tasks };
  const defaults: EntryFormDefaults = {
    title: entry.title ?? "",
    description: entry.description ?? "",
    workType: entry.workType,
    startedAt: toDateTimeLocalInput(entry.startedAt),
    endedAt: toDateTimeLocalInput(entry.endedAt),
    clientId: entry.clientId ?? "",
    projectId: entry.projectId ?? "",
    taskId: entry.taskId ?? "",
    serviceId: entry.serviceId ?? "",
    billable: entry.billable,
    hourlyRate: entry.hourlyRate?.toString() ?? "",
  };

  return (
    <div>
      <Link
        href="/time"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tiempo
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">
            {entry.title || "Entrada de tiempo"}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={TIME_ENTRY_STATUS[entry.status].tone}>
              {TIME_ENTRY_STATUS[entry.status].label}
            </Badge>
            <span className="font-mono text-sm font-bold text-lavender">
              {formatDuration(entry.durationSeconds)}
            </span>
            {entry.calculatedAmount ? (
              <span className="text-sm text-mist">
                {formatMoney(entry.calculatedAmount.toString(), { cents: true })}
              </span>
            ) : null}
          </div>
        </div>
        <EntryStatusControl entryId={entry.id} current={entry.status} locked={locked} />
      </div>

      {locked ? (
        <div className="mb-5 flex items-center gap-2 rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <Lock className="h-4 w-4" />
          Entrada bloqueada: está en cola de factura o ya facturada. No se puede
          editar sin desbloqueo.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              {locked ? (
                <div className="space-y-2 text-sm text-mist">
                  <p>
                    <span className="k-label mr-2">Cliente</span>
                    {entry.client?.name ?? "—"}
                  </p>
                  <p>
                    <span className="k-label mr-2">Proyecto</span>
                    {entry.project?.name ?? "—"}
                  </p>
                  <p>
                    <span className="k-label mr-2">Descripción</span>
                    {entry.description ?? "—"}
                  </p>
                </div>
              ) : (
                <EntryForm
                  action={updateEntryAction.bind(null, entry.id)}
                  defaults={defaults}
                  selects={selects}
                  submitLabel="Guardar cambios"
                />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-mist">
              <p>
                Origen:{" "}
                {entry.source === "timer"
                  ? "cronómetro"
                  : entry.source === "manual"
                    ? "manual"
                    : entry.source}
              </p>
              <p>
                Tarifa aplicada:{" "}
                {entry.hourlyRate ? `${Number(entry.hourlyRate)} €/h` : "—"}
              </p>
            </CardBody>
          </Card>
          {!locked ? (
            <div className="flex justify-end">
              <ConfirmDelete
                action={deleteEntryAction.bind(null, entry.id)}
                title="Eliminar entrada"
                description="La entrada se archivará (borrado suave)."
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
