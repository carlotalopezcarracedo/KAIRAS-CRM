import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { WORK_TYPE, TIME_ENTRY_STATUS } from "@/lib/labels";
import { formatMoney, formatDuration, cn, dateKey } from "@/lib/utils";
import {
  startOfDayMadrid,
  endOfDayMadrid,
  startOfWeekMadrid,
  startOfMonthMadrid,
  parseMadridLocal,
  addDays,
} from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import {
  listEntries,
  getTimeSummary,
  getActiveTimer,
  type TimeFilters as TimeFiltersType,
} from "@/server/services/time-service";
import { HoursBars, DistributionDonut, type DayHours } from "@/components/charts/kairas-charts";
import { ManualEntryDialog } from "./manual-entry-dialog";
import { StartTimerButton } from "./start-timer-button";
import { TimeFilters } from "./time-filters";
import type { EntrySelectData } from "./entry-form";
import Link from "next/link";

export const metadata: Metadata = { title: "Tiempo" };

type Range = "day" | "week" | "month" | "prev" | "custom";

function isTimerTooLong(startedAt: Date): boolean {
  return Date.now() - startedAt.getTime() > 8 * 3600 * 1000;
}

function getRange(
  range: Range,
  fromParam?: string,
  toParam?: string,
): { from: Date; to: Date; label: string } {
  // Todos los límites en hora de Madrid (el servidor puede correr en UTC)
  if (range === "day") {
    return { from: startOfDayMadrid(), to: endOfDayMadrid(), label: "Hoy" };
  }
  if (range === "month") {
    return {
      from: startOfMonthMadrid(0),
      to: new Date(startOfMonthMadrid(1).getTime() - 1),
      label: "Este mes",
    };
  }
  if (range === "prev") {
    return {
      from: startOfMonthMadrid(-1),
      to: new Date(startOfMonthMadrid(0).getTime() - 1),
      label: "Mes anterior",
    };
  }
  if (range === "custom" && fromParam && toParam) {
    const from = parseMadridLocal(fromParam);
    const to = parseMadridLocal(toParam + "T23:59:59");
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to >= from) {
      return { from, to, label: "Rango personalizado" };
    }
  }
  // semana (lunes a domingo) — también fallback de custom incompleto
  const from = startOfWeekMadrid();
  const to = new Date(addDays(from, 7).getTime() - 1);
  return { from, to, label: "Esta semana" };
}

const dayFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
const shortDay = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
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
  const range: Range = ["day", "week", "month", "prev", "custom"].includes(
    String(raw.range),
  )
    ? (raw.range as Range)
    : "week";
  const { from, to, label } = getRange(
    range,
    typeof raw.from === "string" ? raw.from : undefined,
    typeof raw.to === "string" ? raw.to : undefined,
  );

  const filters: TimeFiltersType = {
    clientId: typeof raw.clientId === "string" && raw.clientId ? raw.clientId : undefined,
    projectId:
      typeof raw.projectId === "string" && raw.projectId ? raw.projectId : undefined,
    billable: raw.billable === "1" ? true : raw.billable === "0" ? false : undefined,
  };

  const [entries, summary, activeTimer, clients, projects, services, tasks] =
    await Promise.all([
      listEntries(user.id, { from, to }, filters),
      getTimeSummary(user.id, { from, to }, filters),
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
  const timerTooLong = activeTimer && isTimerTooLong(activeTimer.startedAt);

  // Serie de días completa para la gráfica (rellena huecos con 0)
  const chartDays: DayHours[] = [];
  const totalDays = Math.min(
    62,
    Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );
  for (let i = 0; i < totalDays; i++) {
    const cursor = addDays(from, i);
    const key = dateKey(cursor);
    const day = summary.byDay.get(key);
    chartDays.push({
      label: shortDay.format(cursor).replace(",", ""),
      facturable: day?.billableSeconds ?? 0,
      interno: (day?.seconds ?? 0) - (day?.billableSeconds ?? 0),
    });
  }

  const donutData = summary.byWorkType.slice(0, 8).map((row) => ({
    name: WORK_TYPE[row.workType as keyof typeof WORK_TYPE].label,
    value: row.seconds,
  }));

  // Agrupar entradas por día
  const byDay = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = dateKey(entry.startedAt);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const exportParams = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (filters.clientId) exportParams.set("clientId", filters.clientId);
  if (filters.projectId) exportParams.set("projectId", filters.projectId);
  if (filters.billable !== undefined)
    exportParams.set("billable", filters.billable ? "1" : "0");

  return (
    <div>
      <PageHeader
        title="Tiempo"
        subtitle={`${label} · ${summary.entriesCount} entradas`}
        actions={
          <>
            <a
              href={`/time/export?${exportParams.toString()}`}
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

      <TimeFilters clients={clients} projects={projects} />

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {/* Analítica */}
      {summary.totalSeconds > 0 ? (
        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Horas por día</CardTitle>
              <span className="text-xs text-faint">
                <span className="mr-3 inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-violet" />
                  facturable
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-raise" />
                  interno
                </span>
              </span>
            </CardHeader>
            <CardBody>
              <HoursBars data={chartDays} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Por tipo de trabajo</CardTitle>
            </CardHeader>
            <CardBody>
              {donutData.length > 0 ? (
                <DistributionDonut data={donutData} />
              ) : (
                <p className="text-sm text-faint">Sin datos.</p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Entradas */}
        <div className="space-y-5 lg:col-span-2">
          {entries.length === 0 ? (
            <EmptyState
              title="Sin tiempo registrado con estos filtros"
              hint="Arranca el cronómetro, registra una entrada manual o ajusta los filtros."
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
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-mist">{row.name}</span>
                      <span className="shrink-0 font-semibold text-foam">
                        {formatDuration(row.seconds)}
                        {row.amount > 0 ? (
                          <span className="ml-1.5 text-xs text-lavender">
                            {formatMoney(row.amount)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-raise">
                      <div
                        className="h-full rounded-full bg-violet/60"
                        style={{
                          width: `${Math.max(3, (row.seconds / Math.max(1, summary.byClient[0].seconds)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ranking de proyectos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {summary.byProject.length === 0 ? (
                <p className="text-sm text-faint">Sin datos.</p>
              ) : (
                summary.byProject.map((row, index) => (
                  <div key={row.id} className="flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-faint">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-mist">
                      {row.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-foam">
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
