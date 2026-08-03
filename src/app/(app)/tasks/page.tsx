import type { Metadata } from "next";
import { IntentLink } from "@/components/navigation/intent-link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import {
  listTasks,
  getTaskCounts,
  type TaskView,
} from "@/server/services/task-service";
import { TaskQuickAdd } from "./task-quick-add";
import { TaskRow, type TaskRowData } from "./task-row";

export const metadata: Metadata = { title: "Tareas" };

const VIEWS: { key: TaskView; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "overdue", label: "Vencidas" },
  { key: "upcoming", label: "Próximas" },
  { key: "all", label: "Abiertas" },
  { key: "done", label: "Hechas" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const view = (
    VIEWS.some((v) => v.key === raw.view) ? raw.view : "today"
  ) as TaskView;

  const [tasks, counts, projects] = await Promise.all([
    listTasks(view),
    getTaskCounts(),
    prisma.project.findMany({
      where: { deletedAt: null, status: { notIn: ["completed", "cancelled"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const countFor: Record<string, number | null> = {
    today: counts.today,
    overdue: counts.overdue,
    upcoming: counts.upcoming,
    all: counts.all,
    done: null,
  };

  const rows: TaskRowData[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    dueAt: t.dueAt?.toISOString() ?? null,
    billable: t.billable,
    projectName: t.project?.name ?? null,
    projectId: t.projectId,
    clientName: t.client?.name ?? null,
    clientId: t.clientId,
    leadName: t.lead?.name ?? null,
    leadId: t.leadId,
  }));

  return (
    <div>
      <PageHeader
        title="Tareas"
        subtitle={
          counts.overdue > 0
            ? `${counts.overdue} vencidas — a por ellas`
            : `${counts.all} abiertas`
        }
      />

      <div className="mb-4">
        <TaskQuickAdd projects={projects} />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <IntentLink
            key={v.key}
            href={`/tasks?view=${v.key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              view === v.key
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
              v.key === "overdue" &&
                counts.overdue > 0 &&
                view !== "overdue" &&
                "border-danger/30 text-danger",
            )}
          >
            {v.label}
            {countFor[v.key] !== null ? (
              <span className="ml-1.5 opacity-70">{countFor[v.key]}</span>
            ) : null}
          </IntentLink>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            view === "today"
              ? "Nada para hoy"
              : view === "overdue"
                ? "Sin tareas vencidas. Bien."
                : view === "done"
                  ? "Aún no has completado tareas"
                  : "Sin tareas aquí"
          }
          hint="Crea tareas con el formulario de arriba. Puedes asociarlas a proyecto y arrancar el cronómetro desde cada una."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
