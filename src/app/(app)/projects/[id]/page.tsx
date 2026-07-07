import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EntityNoteForm } from "@/components/entity-note-form";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { PROJECT_STATUS, PRIORITY, PROJECT_BILLING } from "@/lib/labels";
import { formatMoney, formatDate, formatDateTime, formatDuration } from "@/lib/utils";
import { getProjectFull } from "@/server/services/project-service";
import { deleteProjectAction, addProjectNoteAction } from "../actions";
import { TaskQuickAdd } from "../../tasks/task-quick-add";
import { TaskRow, type TaskRowData } from "../../tasks/task-row";
import { StartTimerButton } from "../../time/start-timer-button";

export const metadata: Metadata = { title: "Proyecto" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="k-label shrink-0 pt-0.5">{label}</span>
      <span className="text-right text-sm text-foam">{value || "—"}</span>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProjectFull(id);
  if (!data) notFound();
  const {
    project,
    totalSeconds,
    billableSeconds,
    estimatedAmount,
    effectiveRate,
    hoursCost,
    profitability,
  } = data;

  const overdue =
    project.deadline &&
    project.deadline < new Date() &&
    !["completed", "cancelled"].includes(project.status);

  const taskRows: TaskRowData[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    dueAt: t.dueAt?.toISOString() ?? null,
    billable: t.billable,
    projectName: null,
    projectId: t.projectId,
    clientName: null,
    clientId: t.clientId,
    leadName: null,
    leadId: t.leadId,
  }));

  return (
    <div>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Proyectos
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={PROJECT_STATUS[project.status].tone}>
              {PROJECT_STATUS[project.status].label}
            </Badge>
            <Badge tone={PRIORITY[project.priority].tone}>
              {PRIORITY[project.priority].label}
            </Badge>
            <Badge tone={PROJECT_BILLING[project.billingMode].tone}>
              {PROJECT_BILLING[project.billingMode].label}
            </Badge>
            <Link
              href={`/clients/${project.client.id}`}
              className="text-xs font-semibold text-lavender hover:underline"
            >
              {project.client.name}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StartTimerButton
            projectId={project.id}
            clientId={project.clientId}
            serviceId={project.mainServiceId}
            title={project.name}
          />
          <ButtonLink href={`/projects/${project.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </ButtonLink>
        </div>
      </div>

      {/* KPIs adaptados al modo de cobro */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Horas"
          value={formatDuration(totalSeconds)}
          hint={`${formatDuration(billableSeconds)} facturables`}
        />
        <StatCard
          label={
            project.billingMode === "hourly" ? "A facturar por horas" : "Importe por horas"
          }
          value={formatMoney(estimatedAmount)}
          hint={`tarifa ${effectiveRate.rate} €/h (${
            { project: "del proyecto", client: "del cliente", service: "del servicio", global: "global", none: "sin tarifa" }[effectiveRate.source]
          })`}
          accent={project.billingMode === "hourly" && estimatedAmount > 0}
        />
        <StatCard
          label={
            project.billingMode === "fixed"
              ? "Precio cerrado"
              : project.billingMode === "retainer"
                ? "Cuota / presupuesto"
                : "Presupuesto"
          }
          value={formatMoney(project.budget?.toString())}
          hint={
            project.billingMode === "retainer"
              ? "la cuota mensual vive en Recurrentes"
              : project.billingMode === "hourly"
                ? "techo opcional en modo por horas"
                : project.budget
                  ? `coste-horas ${formatMoney(hoursCost)}`
                  : "sin precio fijado"
          }
          accent={project.billingMode === "fixed" && !!project.budget}
        />
        <StatCard
          label="Rentabilidad est."
          value={
            project.billingMode === "hourly"
              ? "por horas"
              : profitability !== null
                ? `${profitability}%`
                : "—"
          }
          hint={
            project.billingMode === "hourly"
              ? "cada hora facturable es margen"
              : "precio cerrado vs horas × tarifa"
          }
          accent={
            project.billingMode !== "hourly" &&
            profitability !== null &&
            profitability < 30
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Tareas */}
          <Card>
            <CardHeader>
              <CardTitle>
                Tareas (
                {taskRows.filter((t) => !["done", "cancelled"].includes(t.status)).length}{" "}
                abiertas)
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <TaskQuickAdd
                fixedProjectId={project.id}
                fixedClientId={project.clientId}
              />
              {taskRows.length === 0 ? (
                <p className="text-sm text-faint">Sin tareas todavía.</p>
              ) : (
                <div className="space-y-2">
                  {taskRows.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Alcance */}
          {(project.description || project.scope || project.outOfScope || project.deliverables) && (
            <Card>
              <CardHeader>
                <CardTitle>Alcance</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {project.description ? (
                  <div>
                    <p className="k-label mb-1">Descripción</p>
                    <p className="whitespace-pre-wrap text-sm text-mist">
                      {project.description}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.scope ? (
                    <div className="rounded-xl border border-ok/20 bg-ok-soft/40 p-4">
                      <p className="k-label mb-1 text-ok">Incluye</p>
                      <p className="whitespace-pre-wrap text-sm text-mist">
                        {project.scope}
                      </p>
                    </div>
                  ) : null}
                  {project.outOfScope ? (
                    <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-4">
                      <p className="k-label mb-1 text-danger">No incluye</p>
                      <p className="whitespace-pre-wrap text-sm text-mist">
                        {project.outOfScope}
                      </p>
                    </div>
                  ) : null}
                </div>
                {project.deliverables ? (
                  <div>
                    <p className="k-label mb-1">Entregables</p>
                    <p className="whitespace-pre-wrap text-sm text-mist">
                      {project.deliverables}
                    </p>
                  </div>
                ) : null}
                {project.nextSteps ? (
                  <div>
                    <p className="k-label mb-1">Próximos pasos</p>
                    <p className="whitespace-pre-wrap text-sm text-mist">
                      {project.nextSteps}
                    </p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          )}

          {/* Archivos */}
          <AttachmentsPanel
            entityType="project"
            entityId={project.id}
            revalidatePath={`/projects/${project.id}`}
          />

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas ({project.notes.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <EntityNoteForm action={addProjectNoteAction.bind(null, project.id)} />
              {project.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-line bg-ink/40 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-mist">{note.content}</p>
                  <p className="mt-2 text-xs text-faint">{formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-line">
              <InfoRow label="Servicio" value={project.mainService?.name} />
              <InfoRow label="Inicio" value={formatDate(project.startAt)} />
              <InfoRow
                label="Deadline"
                value={
                  project.deadline ? (
                    <span className={overdue ? "font-semibold text-danger" : undefined}>
                      {formatDate(project.deadline)}
                    </span>
                  ) : null
                }
              />
              <InfoRow
                label="Margen estimado"
                value={
                  project.estimatedMargin != null
                    ? `${Number(project.estimatedMargin)}%`
                    : null
                }
              />
              <InfoRow label="Creado" value={formatDate(project.createdAt)} />
            </CardBody>
          </Card>

          <div className="flex justify-end">
            <ConfirmDelete
              action={deleteProjectAction.bind(null, project.id)}
              title="Eliminar proyecto"
              description={`"${project.name}" se archivará. Sus tareas y horas no se borran.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
