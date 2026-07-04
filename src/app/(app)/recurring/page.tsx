import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RECURRING_STATUS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/utils";
import { listRecurring } from "@/server/services/catalog-service";
import { GenerateDraftButton } from "./generate-draft-button";

export const metadata: Metadata = { title: "Recurrentes" };

const periodicityLabel: Record<string, string> = {
  monthly: "mensual",
  quarterly: "trimestral",
  yearly: "anual",
  weekly: "semanal",
  custom: "custom",
};

function nowPlusDays(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

export default async function RecurringPage() {
  const { rows, mrr } = await listRecurring();
  const horizon = nowPlusDays(7);
  const today = nowPlusDays(0);
  const dueSoon = rows.filter(
    (r) => r.status === "active" && r.nextInvoiceAt && r.nextInvoiceAt <= horizon,
  );

  return (
    <div>
      <PageHeader
        title="Recurrentes"
        subtitle={`${rows.filter((r) => r.status === "active").length} activos`}
        actions={
          <ButtonLink href="/recurring/new">
            <Plus className="h-4 w-4" />
            Nuevo recurrente
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR" value={formatMoney(mrr)} accent={mrr > 0} />
        <StatCard label="ARR" value={formatMoney(mrr * 12)} hint="anualizado" />
        <StatCard
          label="Ciclos próximos · 7d"
          value={dueSoon.length}
          hint={dueSoon.length > 0 ? "toca facturar" : "nada pendiente"}
          accent={dueSoon.length > 0}
        />
        <StatCard
          label="Servicios activos"
          value={rows.filter((r) => r.status === "active").length}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Sin ingresos recurrentes todavía"
          hint="Redes sociales, mantenimiento web, soporte… aquí es donde se construye la base estable."
          action={
            <ButtonLink href="/recurring/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear recurrente
            </ButtonLink>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Servicio</TH>
              <TH>Cliente</TH>
              <TH className="text-right">Importe</TH>
              <TH>Periodicidad</TH>
              <TH>Próximo ciclo</TH>
              <TH>Estado</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => {
              const due =
                r.status === "active" && r.nextInvoiceAt && r.nextInvoiceAt <= today;
              return (
                <TR key={r.id}>
                  <TD>
                    <span className="font-semibold text-foam">
                      {r.title ?? r.service.name}
                    </span>
                  </TD>
                  <TD>
                    <Link
                      href={`/clients/${r.client.id}`}
                      className="text-mist hover:text-lavender"
                    >
                      {r.client.name}
                    </Link>
                  </TD>
                  <TD className="text-right font-semibold text-foam">
                    {formatMoney(Number(r.amount))}
                  </TD>
                  <TD className="text-mist">{periodicityLabel[r.periodicity]}</TD>
                  <TD className={due ? "font-semibold text-warn" : "text-mist"}>
                    {formatDate(r.nextInvoiceAt)}
                    {due ? " · vencido" : ""}
                  </TD>
                  <TD>
                    <Badge tone={RECURRING_STATUS[r.status].tone}>
                      {RECURRING_STATUS[r.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "active" ? (
                        <GenerateDraftButton recurringId={r.id} />
                      ) : null}
                      <Link
                        href={`/recurring/${r.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-lavender hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Link>
                    </div>
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
