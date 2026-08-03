import type { Metadata } from "next";
import { MessageCircle, Plus } from "lucide-react";
import { IntentLink } from "@/components/navigation/intent-link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  LEAD_SOURCE,
  OPPORTUNITY_STAGE,
  PRIORITY,
} from "@/lib/labels";
import { TemperatureBadge } from "@/components/crm/temperature-badge";
import { addDays } from "@/lib/dates";
import {
  formatMoney,
  formatDateTime,
  formatDuration,
  relativeDays,
  dateKey,
} from "@/lib/utils";
import { getDashboardData } from "@/server/services/dashboard-service";
import { HoursBars, type DayHours } from "@/components/charts/kairas-charts";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Hoy" };

const STAGE_ORDER = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
] as const;

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  const data = await getDashboardData(session.user.id);
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  // Serie de la semana (L-D) para la gráfica
  const weekChart: DayHours[] = [];
  for (let i = 0; i < 7; i++) {
    const cursor = addDays(data.week.from, i);
    const key = dateKey(cursor);
    const day = data.week.byDay.get(key);
    weekChart.push({
      label: `${WEEKDAY_LABELS[i]} ${Number(key.slice(8, 10))}`,
      facturable: day?.billableSeconds ?? 0,
      interno: (day?.seconds ?? 0) - (day?.billableSeconds ?? 0),
    });
  }

  const alertItems = [
    data.followUpsOverdueCount > 0
      ? {
          href: "/leads",
          text: `${data.followUpsOverdueCount} seguimientos comerciales vencidos`,
        }
      : null,
    data.overdueTasks.length > 0
      ? { href: "/tasks?view=overdue", text: `${data.overdueTasks.length} tareas vencidas` }
      : null,
    data.alerts.overdueInvoicesCount > 0
      ? {
          href: "/finance",
          text: `${data.alerts.overdueInvoicesCount} facturas vencidas sin cobrar`,
        }
      : null,
    data.alerts.recurringDueCount > 0
      ? {
          href: "/recurring",
          text: `${data.alerts.recurringDueCount} ciclos recurrentes por facturar`,
        }
      : null,
    data.alerts.oppsWithoutNextAction > 0
      ? {
          href: "/pipeline",
          text: `${data.alerts.oppsWithoutNextAction} oportunidades sin siguiente acción`,
        }
      : null,
  ].filter((a): a is { href: string; text: string } => a !== null);

  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date());

  const maxStageValue = Math.max(
    1,
    ...STAGE_ORDER.map((s) => data.byStage.get(s)?.value ?? 0),
  );
  const maxSourceCount = Math.max(1, ...data.leadsBySource30d.map((r) => r.count));

  return (
    <div>
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : "Hoy"}
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <ButtonLink href="/leads/new" size="sm" prefetch={false}>
            <Plus className="h-4 w-4" />
            Nuevo lead
          </ButtonLink>
        }
      />

      {/* Alertas */}
      {alertItems.length > 0 ? (
        <div className="mb-5 rounded-card border border-warn/25 bg-warn-soft/50 px-4 py-3">
          <p className="k-label mb-1.5 text-warn">Requiere atención</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {alertItems.map((alert) => (
              <IntentLink
                key={alert.text}
                href={alert.href}
                className="text-sm font-medium text-foam hover:text-warn"
              >
                {alert.text} →
              </IntentLink>
            ))}
          </div>
        </div>
      ) : null}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Leads nuevos · 7d"
          value={data.leadsNew7d}
          hint={`${data.hotLeadsCount} calientes en total`}
          href="/leads"
        />
        <StatCard
          label="Seguimientos"
          value={data.followUps.length}
          hint={
            data.followUpsOverdueCount > 0
              ? `${data.followUpsOverdueCount} vencidos`
              : "al día"
          }
          href="/leads?status=follow_up"
          accent={data.followUpsOverdueCount > 0}
        />
        <StatCard
          label="Pipeline abierto"
          value={formatMoney(data.pipelineOpen)}
          hint={`${formatMoney(data.pipelineWeighted)} ponderado · ${data.openOpportunitiesCount} oportunidades`}
          href="/pipeline"
        />
        <StatCard
          label="Recurrente · MRR"
          value={formatMoney(data.mrr)}
          hint={`${data.activeRecurringCount} servicios activos`}
          href="/recurring"
        />
      </div>

      {/* KPIs secundarios */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Previsto este mes"
          value={formatMoney(data.expectedThisMonth)}
          hint="cierre estimado ponderado"
          href="/pipeline"
        />
        <StatCard
          label="Propuestas fuera"
          value={data.proposalsPending}
          hint="esperando respuesta"
          href="/proposals"
        />
        <StatCard
          label="Proyectos activos"
          value={data.activeProjectsCount}
          href="/projects"
        />
        <StatCard
          label="Facturación pendiente"
          value={data.invoiceDraftsPending + data.invoicesPendingPaymentCount}
          hint={
            data.invoicesPendingPaymentSum > 0
              ? `${formatMoney(data.invoicesPendingPaymentSum)} por cobrar`
              : "cola Odoo + cobros"
          }
          href="/finance"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* HOY: seguimientos + tareas + agenda */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hoy toca</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            {/* Seguimientos comerciales */}
            <div>
              <p className="k-label mb-2.5">Seguimientos comerciales</p>
              {data.followUps.length === 0 ? (
                <p className="text-sm text-faint">
                  Nada pendiente. Los leads con siguiente acción para hoy o vencida
                  aparecerán aquí.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.followUps.map((lead) => {
                    const overdue =
                      lead.nextActionAt && lead.nextActionAt < new Date();
                    return (
                      <li key={lead.id}>
                        <div className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5">
                          <IntentLink
                            href={`/leads/${lead.id}`}
                            className="min-w-0 flex-1"
                          >
                            <p className="truncate text-sm font-semibold text-foam hover:text-lavender">
                              {lead.name}
                            </p>
                            <p className="truncate text-xs text-mist">
                              {lead.nextAction || "Seguimiento"}
                              <span
                                className={
                                  overdue
                                    ? "ml-1.5 font-semibold text-danger"
                                    : "ml-1.5 text-faint"
                                }
                              >
                                {relativeDays(lead.nextActionAt)}
                              </span>
                            </p>
                          </IntentLink>
                          <TemperatureBadge temperature={lead.temperature} />
                          {lead.phone ? (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir WhatsApp"
                              className="rounded-full p-2 text-ok transition-colors hover:bg-raise"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Tareas de hoy y vencidas */}
            <div>
              <p className="k-label mb-2.5">Tareas</p>
              {data.overdueTasks.length === 0 && data.todayTasks.length === 0 ? (
                <p className="text-sm text-faint">
                  Sin tareas para hoy. El módulo de tareas llega en la Fase 4; las
                  tareas creadas ya contarán aquí.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.overdueTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger-soft/40 px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-foam">
                        {task.title}
                      </span>
                      <span className="text-xs font-semibold text-danger">
                        vencida · {relativeDays(task.dueAt)}
                      </span>
                    </li>
                  ))}
                  {data.todayTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-foam">
                        {task.title}
                      </span>
                      <Badge tone={PRIORITY[task.priority].tone}>
                        {PRIORITY[task.priority].label}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Agenda de hoy */}
            <div>
              <p className="k-label mb-2.5">Agenda</p>
              {data.todayEvents.length === 0 ? (
                <p className="text-sm text-faint">Sin reuniones hoy.</p>
              ) : (
                <ul className="space-y-2">
                  {data.todayEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                    >
                      <span className="text-sm font-medium text-foam">
                        {event.title}
                      </span>
                      <span className="text-xs text-mist">
                        {formatDateTime(event.startAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Lateral: semana + pipeline + fuentes */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Esta semana</CardTitle>
              <span className="text-xs font-semibold text-lavender">
                {formatDuration(data.week.totalSeconds)}
              </span>
            </CardHeader>
            <CardBody>
              {data.week.totalSeconds > 0 ? (
                <>
                  <HoursBars data={weekChart} height={130} />
                  <p className="mt-2 text-xs text-faint">
                    {formatDuration(data.week.billableSeconds)} facturables
                    {data.week.billableAmount > 0
                      ? ` · ${formatMoney(data.week.billableAmount)} estimados`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-faint">
                  Sin horas esta semana. El cronómetro está arriba, a un clic.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline por etapa</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.openOpportunitiesCount === 0 ? (
                <p className="text-sm text-faint">
                  Sin oportunidades abiertas. Se crean desde un lead o desde el
                  pipeline (Fase 3).
                </p>
              ) : (
                STAGE_ORDER.map((stage) => {
                  const entry = data.byStage.get(stage);
                  if (!entry) return null;
                  return (
                    <div key={stage}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-mist">
                          {OPPORTUNITY_STAGE[stage].label}
                          <span className="ml-1.5 text-faint">×{entry.count}</span>
                        </span>
                        <span className="text-faint">{formatMoney(entry.value)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-raise">
                        <div
                          className="h-full rounded-full bg-violet/70"
                          style={{
                            width: `${Math.max(4, (entry.value / maxStageValue) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads por fuente · 30d</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.leadsBySource30d.length === 0 ? (
                <p className="text-sm text-faint">
                  Aún no hay leads este mes. Cuando entren, verás aquí qué canal
                  funciona mejor.
                </p>
              ) : (
                data.leadsBySource30d.map((row) => (
                  <div key={row.source}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-mist">
                        {LEAD_SOURCE[row.source].label}
                      </span>
                      <span className="text-faint">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-raise">
                      <div
                        className="h-full rounded-full bg-lavender/60"
                        style={{
                          width: `${Math.max(4, (row.count / maxSourceCount) * 100)}%`,
                        }}
                      />
                    </div>
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
