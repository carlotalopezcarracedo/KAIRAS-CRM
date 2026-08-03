import type { Metadata } from "next";
import { toDateTimeLocalInput } from "@/lib/dates";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { formatDuration } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getTask } from "@/server/services/task-service";
import { TaskDetailForm, type TaskFormDefaults } from "./task-detail-form";
import { Checklist } from "./checklist";
import { deleteTaskAction } from "../actions";
import { StartTimerButton } from "../../time/start-timer-button";

export const metadata: Metadata = { title: "Tarea" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, projects, clients, leads, opportunities] = await Promise.all([
    getTask(id),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, name: true },
    }),
    prisma.opportunity.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, title: true },
    }),
  ]);
  if (!task) notFound();

  const checklist = Array.isArray(task.checklist)
    ? (task.checklist as { label: string; done: boolean }[])
    : [];

  const trackedSeconds = task.timeEntries.reduce(
    (acc, e) => acc + e.durationSeconds,
    0,
  );

  const defaults: TaskFormDefaults = {
    title: task.title,
    description: task.description ?? "",
    type: task.type,
    status: task.status,
    priority: task.priority,
    dueAt: toDateTimeLocalInput(task.dueAt),
    remindAt: toDateTimeLocalInput(task.remindAt),
    estimatedHours: task.estimatedHours?.toString() ?? "",
    billable: task.billable,
    leadId: task.leadId ?? "",
    clientId: task.clientId ?? "",
    projectId: task.projectId ?? "",
    opportunityId: task.opportunityId ?? "",
    checklist: checklist.map((c) => c.label).join("\n"),
  };

  return (
    <div>
      <Link
        href="/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tareas
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-foam">
          {task.title}
        </h1>
        <div className="flex items-center gap-2">
          <StartTimerButton
            taskId={task.id}
            title={task.title}
            projectId={task.projectId}
            clientId={task.clientId}
            billable={task.billable}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              <TaskDetailForm
                taskId={task.id}
                defaults={defaults}
                projects={projects}
                clients={clients}
                leads={leads}
                opportunities={opportunities}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Tiempo</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5">
              <p className="text-2xl font-extrabold text-foam">
                {trackedSeconds > 0 ? formatDuration(trackedSeconds) : "0min"}
              </p>
              <p className="text-xs text-faint">
                registradas en esta tarea
                {task.estimatedHours
                  ? ` · estimadas ${Number(task.estimatedHours)}h`
                  : ""}
              </p>
            </CardBody>
          </Card>

          {checklist.length > 0 ? (
            <Card>
              <CardBody>
                <Checklist taskId={task.id} items={checklist} />
              </CardBody>
            </Card>
          ) : null}

          <AttachmentsPanel
            entityType="task"
            entityId={task.id}
            revalidatePath={`/tasks/${task.id}`}
          />

          <div className="flex justify-end">
            <ConfirmDelete
              action={deleteTaskAction.bind(null, task.id)}
              title="Eliminar tarea"
              description={`"${task.title}" se archivará (borrado suave).`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
