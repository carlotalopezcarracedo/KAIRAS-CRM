import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PROJECT_STATUS, PRIORITY } from "@/lib/labels";
import { formatMoney, formatDate, formatDuration, cn } from "@/lib/utils";
import { listProjects } from "@/server/services/project-service";
import { PROJECT_STATUSES } from "@/server/validators/project";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const statusFilter =
    typeof raw.status === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(raw.status)
      ? raw.status
      : undefined;

  const projects = await listProjects({ status: statusFilter });
  const active = projects.filter(
    (p) => !["completed", "cancelled", "not_started"].includes(p.status),
  ).length;

  return (
    <div>
      <PageHeader
        title="Proyectos"
        subtitle={`${projects.length} proyectos · ${active} en marcha`}
        actions={
          <ButtonLink href="/projects/new">
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </ButtonLink>
        }
      />

      {/* Filtro por estado */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/projects"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            !statusFilter
              ? "border-violet-line bg-violet-soft text-lavender"
              : "border-line bg-surface text-faint hover:text-foam",
          )}
        >
          Todos
        </Link>
        {PROJECT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/projects?status=${s}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {PROJECT_STATUS[s].label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title={statusFilter ? "Nada con este estado" : "Sin proyectos todavía"}
          hint="Un proyecto siempre cuelga de un cliente. Crea el cliente primero si no existe."
          action={
            <ButtonLink href="/projects/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear proyecto
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Proyecto</TH>
                  <TH>Estado</TH>
                  <TH>Prioridad</TH>
                  <TH className="text-right">Presupuesto</TH>
                  <TH className="text-right">Horas</TH>
                  <TH className="text-right">Tareas</TH>
                  <TH>Deadline</TH>
                </tr>
              </THead>
              <TBody>
                {projects.map((p) => {
                  const overdue =
                    p.deadline &&
                    p.deadline < new Date() &&
                    !["completed", "cancelled"].includes(p.status);
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-semibold text-foam hover:text-lavender"
                        >
                          {p.name}
                        </Link>
                        <span className="block text-xs text-faint">
                          {p.client.name}
                          {p.mainService ? ` · ${p.mainService.name}` : ""}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone={PROJECT_STATUS[p.status].tone}>
                          {PROJECT_STATUS[p.status].label}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge tone={PRIORITY[p.priority].tone}>
                          {PRIORITY[p.priority].label}
                        </Badge>
                      </TD>
                      <TD className="text-right text-mist">
                        {formatMoney(p.budget?.toString())}
                      </TD>
                      <TD className="text-right text-mist">
                        {p.totalSeconds > 0 ? formatDuration(p.totalSeconds) : "—"}
                      </TD>
                      <TD className="text-right text-mist">
                        {p.openTasks}/{p.totalTasks}
                      </TD>
                      <TD className={overdue ? "font-semibold text-danger" : "text-mist"}>
                        {formatDate(p.deadline)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{p.name}</p>
                    <Badge tone={PROJECT_STATUS[p.status].tone}>
                      {PROJECT_STATUS[p.status].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-faint">{p.client.name}</p>
                  <p className="mt-2 text-sm text-mist">
                    {p.openTasks} tareas abiertas
                    {p.deadline ? ` · entrega ${formatDate(p.deadline)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
