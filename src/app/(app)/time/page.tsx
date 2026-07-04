import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { WORK_TYPE, TIME_ENTRY_STATUS } from "@/lib/labels";
import { formatMoney, formatDuration, cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import {
  listEntries,
  getTimeSummary,
  getActiveTimer,
} from "@/server/services/time-service";
import { ManualEntryDialog } from "./manual-entry-dialog";
import { StartTimerButton } from "./start-timer-button";
import type { EntrySelectData } from "./entry-form";

export const metadata: Metadata = { title: "Tiempo" };

type Range = "day" | "week" | "month";

function getRange(range: Range): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (range === "day") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { from, to, label: "Hoy" };
  }
  if (range === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to, label: "Este mes" };
  }
  // semana (lunes a domingo)
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const from = new Date(now);
  from.setDate(now.getDate() - day);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to, label: "Esta semana" };
}

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = await searchParams;
  const range: Range = raw.range === "day" || raw.range === "month" ? raw.range : "week";
  const { from, to, label } = getRange(range);

  const [entries, summary, activeTimer, clients, projects, services, tasks] =
    await Promise.all([
      listEntries(user.id, { from, to }),
      getTimeSummary(user.id, { from, to }),
      getActiveTimer(user.id),
      prisma.client.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        where: { deletedAt: null, status: { notIn: ["completed", "cancelled"] } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.service.findMany({
        where: { active: true, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.task.findMany({
        where: { deletedAt: null, status: { in: ["todo", "in_progress", "waiting"] } },
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: { id: true, title: true },
      }),
    ]);

  const selects: EntrySelectData = { clients, projects, services, tasks };

  // Cronómetro olvidado (más de 8h)
  const timerTooLong =
    activeTimer &&
    Date.now() - activeTimer.startedAt.getTime() > 8 * 3600 * 1000;

  // Agrupar entradas por día
  const byDay = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.startedAt.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const exportUrl = `/time/export?from=${from.toISOString()}&to=${to.toISOString()}`;

  return (
    <div>
      <PageHeader
        title="Tiempo"
        subtitle={`${label} · ${summary.entriesCount} entradas`}
        actions={
          <>
            <a
              href={exportUrl}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-semibold text-mist transition-colors hover:text-foam"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </a>
            <ManualEntryDialog selects={selects} />
            <StartTimerButton />
          </>
        }
      />

      {timerTooLong ? (
        <div className="mb-5 rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          ⚠ Hay un cronómetro corriendo desde hace más de 8 horas. Páralo desde el
          widget de arriba (o descártalo si se te olvidó).
        </div>
      ) : null}

      {/* Rango */}
      <div className="mb-5 flex gap-1.5">
        {(
          [
            ["day", "Hoy"],
            ["week", "Semana"],
            ["month", "Mes"],
          ] as const
        ).map(([key, lbl]) => (
          <Link
            key={key}
            href={`/time?range=${key}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              range === key
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {lbl}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={formatDuration(summary.totalSeconds)} />
        <StatCard
          label="Facturable"
          value={formatDuration(summary.billableSeconds)}
          hint={
            summary.totalSeconds > 0
              ? `${Math.round((summary.billableSeconds / summary.totalSeconds) * 100)}% del total`
              : undefined
          }
        />
        <StatCard
          label="No facturable"
          value={formatDuration(summary.nonBillableSeconds)}
        />
        <StatCard
          label="Importe estimado"
          value={formatMoney(summary.billableAmount, { cents: true })}
          accent={summary.billableAmount > 0}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Entradas */}
        <div className="space-y-5 lg:col-span-2">
          {entries.length === 0 ? (
            <EmptyState
              title="Sin tiempo registrado en este periodo"
              hint="Arranca el cronómetro o registra una entrada manual."
            />
          ) : (
            [...byDay.entries()].map(([day, dayEntries]) => {
              const daySeconds = dayEntries.reduce(
                (acc, e) => acc + e.durationSeconds,
                0,
              );
              return (
                <div key={day}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="k-label">
                      {dayFormatter.format(new Date(day + "T12:00:00"))}
                    </p>
                    <span className="text-xs font-semibold text-mist">
                      {formatDuration(daySeconds)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <Link
                        key={entry.id}
                        href={`/time/${entry.id}`}
                        className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 transition-colors hover:border-line-strong"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foam">
                            {entry.title || WORK_TYPE[entry.workType].label}
                          </p>
                          <p className="truncate text-xs text-faint">
                            {[entry.client?.name, entry.project?.name, entry.task?.title]
                              .filter(Boolean)
                              .join(" · ") || "Sin asignar"}
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          <Badge tone={TIME_ENTRY_STATUS[entry.status].tone}>
                            {TIME_ENTRY_STATUS[entry.status].label}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold tabular-nums text-foam">
                            {formatDuration(entry.durationSeconds)}
                          </p>
                          <p className="text-xs text-faint">
                            {timeFormatter.format(entry.startedAt)}
                            {entry.endedAt
                              ? `–${timeFormatter.format(entry.endedAt)}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "w-16 text-right text-sm font-semibold",
                            entry.billable ? "text-lavender" : "text-faint",
                          )}
                        >
                          {entry.billable
                            ? formatMoney(entry.calculatedAmount?.toString())
                            : "no fact."}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resúmenes */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Por cliente</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {summary.byClient.length === 0 ? (
                <p className="text-sm text-faint">Sin datos.</p>
              ) : (
                summary.byClient.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-mist">{row.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-foam">
                      {formatDuration(row.seconds)}
                      {row.amount > 0 ? (
                        <span className="ml-1.5 text-xs text-lavender">
                          {formatMoney(row.amount)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por proyecto</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {summary.byProject.length === 0 ? (
                <p className="text-sm text-faint">Sin datos.</p>
              ) : (
                summary.byProject.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-mist">{row.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-foam">
                      {formatDuration(row.seconds)}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Por tipo de trabajo</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {summary.byWorkType.length === 0 ? (
                <p className="text-sm text-faint">Sin datos.</p>
              ) : (
                summary.byWorkType.slice(0, 8).map((row) => (
                  <div
                    key={row.workType}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-mist">
                      {WORK_TYPE[row.workType as keyof typeof WORK_TYPE].label}
                    </span>
                    <span className="text-sm font-semibold text-foam">
                      {formatDuration(row.seconds)}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
