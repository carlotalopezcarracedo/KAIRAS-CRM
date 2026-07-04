import type { Metadata } from "next";
import Link from "next/link";
import { Plus, KanbanSquare, Rows3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { OPPORTUNITY_STAGE } from "@/lib/labels";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import {
  listOpportunities,
  getPipelineMetrics,
} from "@/server/services/opportunity-service";
import { KanbanBoard, type KanbanItem } from "./kanban-board";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const view = raw.view === "table" ? "table" : "kanban";
  const includeClosed = view === "table";

  const [opportunities, metrics] = await Promise.all([
    listOpportunities({ includeClosed }),
    getPipelineMetrics(),
  ]);

  const kanbanItems: KanbanItem[] = opportunities
    .filter((o) => o.stage !== "won" && o.stage !== "lost" && o.stage !== "paused")
    .map((o) => ({
      id: o.id,
      title: o.title,
      stage: o.stage,
      estimatedValue: o.estimatedValue ? Number(o.estimatedValue) : null,
      probability: o.probability,
      expectedCloseAt: o.expectedCloseAt?.toISOString() ?? null,
      priority: o.priority,
      nextAction: o.nextAction,
      partyName: o.client?.name ?? o.lead?.name ?? null,
    }));

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${metrics.openCount} oportunidades abiertas`}
        actions={
          <>
            <div className="flex rounded-full border border-line bg-surface p-0.5">
              <Link
                href="/pipeline"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
                  view === "kanban"
                    ? "bg-violet-soft text-lavender"
                    : "text-faint hover:text-foam",
                )}
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                Kanban
              </Link>
              <Link
                href="/pipeline?view=table"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
                  view === "table"
                    ? "bg-violet-soft text-lavender"
                    : "text-faint hover:text-foam",
                )}
              >
                <Rows3 className="h-3.5 w-3.5" />
                Tabla
              </Link>
            </div>
            <ButtonLink href="/pipeline/new" size="sm">
              <Plus className="h-4 w-4" />
              Oportunidad
            </ButtonLink>
          </>
        }
      />

      {/* Métricas */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valor abierto" value={formatMoney(metrics.openValue)} />
        <StatCard
          label="Valor ponderado"
          value={formatMoney(metrics.weightedValue)}
          hint="según probabilidad"
        />
        <StatCard
          label="Ganado este mes"
          value={formatMoney(metrics.wonMonthValue)}
          hint={`${metrics.wonMonthCount} ganadas · ${metrics.lostMonthCount} perdidas`}
        />
        <StatCard
          label="Tasa de cierre"
          value={metrics.winRate !== null ? `${metrics.winRate}%` : "—"}
          hint={
            metrics.withoutNextAction > 0
              ? `${metrics.withoutNextAction} sin siguiente acción`
              : "todo con siguiente acción"
          }
          accent={metrics.withoutNextAction > 0}
        />
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          title="Sin oportunidades todavía"
          hint="Crea una oportunidad manual o conviértela desde un lead (botón en el detalle del lead)."
          action={
            <ButtonLink href="/pipeline/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear oportunidad
            </ButtonLink>
          }
        />
      ) : view === "kanban" ? (
        <KanbanBoard items={kanbanItems} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Oportunidad</TH>
              <TH>Etapa</TH>
              <TH className="text-right">Valor</TH>
              <TH className="text-right">Prob.</TH>
              <TH className="text-right">Ponderado</TH>
              <TH>Cierre previsto</TH>
              <TH>Siguiente acción</TH>
            </tr>
          </THead>
          <TBody>
            {opportunities.map((o) => {
              const value = o.estimatedValue ? Number(o.estimatedValue) : 0;
              return (
                <TR key={o.id}>
                  <TD>
                    <Link
                      href={`/pipeline/${o.id}`}
                      className="font-semibold text-foam hover:text-lavender"
                    >
                      {o.title}
                    </Link>
                    <span className="block text-xs text-faint">
                      {o.client?.name ?? o.lead?.name ?? "—"}
                      {o.service ? ` · ${o.service.name}` : ""}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={OPPORTUNITY_STAGE[o.stage].tone}>
                      {OPPORTUNITY_STAGE[o.stage].label}
                    </Badge>
                  </TD>
                  <TD className="text-right font-semibold text-foam">
                    {formatMoney(
                      o.stage === "won" && o.acceptedValue
                        ? Number(o.acceptedValue)
                        : value,
                    )}
                  </TD>
                  <TD className="text-right text-mist">{o.probability}%</TD>
                  <TD className="text-right text-mist">
                    {formatMoney((value * o.probability) / 100)}
                  </TD>
                  <TD className="text-mist">{formatDate(o.expectedCloseAt)}</TD>
                  <TD className="max-w-48 truncate text-mist">
                    {o.nextAction ?? <span className="text-warn">—</span>}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
