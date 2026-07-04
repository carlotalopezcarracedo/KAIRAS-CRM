import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_SOURCE } from "@/lib/labels";
import { formatMoney, formatDuration, formatDate, cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";
import { getReports } from "@/server/services/report-service";

export const metadata: Metadata = { title: "Informes" };

export default async function ReportsPage() {
  const user = await requireUser();
  const r = await getReports(user.id);

  const maxWeekSeconds = Math.max(1, ...r.weeklyHours.map((w) => w.seconds));
  const maxSource = Math.max(1, ...r.leadsBySource.map((s) => s.count));
  const maxClientRevenue = Math.max(1, ...r.clientRevenue.map((c) => c.total));

  return (
    <div>
      <PageHeader
        title="Informes"
        subtitle="Qué está entrando, qué se está trabajando y qué está rindiendo"
      />

      {/* KPIs generales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pipeline abierto"
          value={formatMoney(r.pipeline.openValue)}
          hint={`${r.pipeline.openCount} oportunidades · ${formatMoney(r.pipeline.weightedValue)} ponderado`}
          href="/pipeline"
        />
        <StatCard
          label="Ganado este mes"
          value={formatMoney(r.sales.wonMonthValue)}
          hint={`${r.sales.wonMonthCount} ganadas · ${r.sales.lostMonthCount} perdidas`}
        />
        <StatCard
          label="MRR"
          value={formatMoney(r.mrr)}
          href="/recurring"
          accent={r.mrr > 0}
        />
        <StatCard
          label="Tasa de cierre"
          value={r.sales.winRate !== null ? `${r.sales.winRate}%` : "—"}
          hint={`${r.sales.wonAll} ganadas / ${r.sales.lostAll} perdidas (histórico)`}
        />
      </div>

      {/* Funnel */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Conversión lead → cliente</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: "Leads totales", value: r.funnel.totalLeads, pct: 100 },
              {
                label: "Con oportunidad",
                value: r.funnel.leadsWithOpp,
                pct: r.funnel.leadToOppRate,
              },
              {
                label: "Convertidos en cliente",
                value: r.funnel.clientsFromLeads,
                pct: r.funnel.leadToClientRate,
              },
            ].map((step) => (
              <div key={step.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-mist">{step.label}</span>
                  <span className="text-faint">
                    {step.value} · {step.pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-raise">
                  <div
                    className="h-full rounded-full bg-violet/70"
                    style={{ width: `${Math.max(2, step.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Horas por semana */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Horas por semana · últimas 8</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
              {r.weeklyHours.map((week) => (
                <div
                  key={week.label}
                  className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch"
                  title={`${formatDuration(week.seconds)} (${formatDuration(week.billableSeconds)} facturables)`}
                >
                  <div className="flex w-full max-w-10 flex-col justify-end gap-px" style={{ height: 100 }}>
                    <div
                      className="w-full rounded-t bg-violet/70"
                      style={{
                        height: `${(week.billableSeconds / maxWeekSeconds) * 100}%`,
                      }}
                    />
                    <div
                      className="w-full bg-raise"
                      style={{
                        height: `${((week.seconds - week.billableSeconds) / maxWeekSeconds) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-faint">{week.label}</span>
                  <span className="font-mono text-[10px] text-mist">
                    {week.seconds > 0 ? formatDuration(week.seconds) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-faint">
              <span className="mr-3 inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-violet/70" />
                facturable
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm bg-raise" />
                no facturable
              </span>
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Rentabilidad por proyecto */}
        <Card>
          <CardHeader>
            <CardTitle>Rentabilidad por proyecto</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {r.projectProfitability.length === 0 ? (
              <p className="text-sm text-faint">
                Sin horas registradas en proyectos todavía.
              </p>
            ) : (
              r.projectProfitability.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5 hover:border-line-strong"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foam">{p.name}</p>
                    <p className="truncate text-xs text-faint">
                      {p.clientName} · {formatDuration(p.seconds)} ·{" "}
                      {formatMoney(p.hoursCost)} en horas
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-bold",
                      p.profitability === null
                        ? "text-faint"
                        : p.profitability < 20
                          ? "text-danger"
                          : p.profitability < 50
                            ? "text-warn"
                            : "text-ok",
                    )}
                  >
                    {p.profitability !== null ? `${p.profitability}%` : "sin ppto."}
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        {/* Ranking clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes por ingresos cobrados</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {r.clientRevenue.length === 0 ? (
              <p className="text-sm text-faint">
                Aún no hay facturas cobradas registradas. Se alimenta de los
                snapshots de factura (Finanzas).
              </p>
            ) : (
              r.clientRevenue.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <Link href={`/clients/${c.id}`} className="font-medium text-mist hover:text-lavender">
                      {c.name}
                    </Link>
                    <span className="text-faint">{formatMoney(c.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raise">
                    <div
                      className="h-full rounded-full bg-lavender/60"
                      style={{ width: `${Math.max(4, (c.total / maxClientRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Leads por fuente */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por fuente · 90 días</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {r.leadsBySource.length === 0 ? (
              <p className="text-sm text-faint">Sin leads en los últimos 90 días.</p>
            ) : (
              r.leadsBySource.map((row) => (
                <div key={row.source}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-mist">
                      {LEAD_SOURCE[row.source].label}
                    </span>
                    <span className="text-faint">{row.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raise">
                    <div
                      className="h-full rounded-full bg-violet/70"
                      style={{ width: `${Math.max(4, (row.count / maxSource) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Tareas vencidas */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas vencidas ({r.overdueTasks.length})</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {r.overdueTasks.length === 0 ? (
              <p className="text-sm text-faint">Nada vencido. Así da gusto.</p>
            ) : (
              r.overdueTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft/30 px-4 py-2.5 hover:border-danger/40"
                >
                  <span className="truncate text-sm text-foam">{t.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-danger">
                    {formatDate(t.dueAt)}
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
