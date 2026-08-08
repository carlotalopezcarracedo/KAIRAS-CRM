import type { Metadata } from "next";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { getTreasuryOverview } from "@/server/services/treasury-service";

export const metadata: Metadata = { title: "Tesorería" };

export default async function TreasuryPage() {
  const { months, firstNegativeMonth, now, quarter } = await getTreasuryOverview(6);

  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.income)));
  const horizonNet = months.at(-1)?.cumulative ?? 0;

  return (
    <div>
      <PageHeader
        title="Tesorería"
        subtitle={`Previsión a 6 meses y provisión de impuestos del ${quarter.label}`}
      />

      {firstNegativeMonth ? (
        <div className="mb-5 rounded-card border border-danger/25 bg-danger-soft/50 px-4 py-3">
          <p className="k-label mb-1 flex items-center gap-2 text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            Aviso de caja
          </p>
          <p className="text-sm text-mist">
            Con la previsión actual, el acumulado se pone en negativo en{" "}
            <strong className="text-foam">{firstNegativeMonth}</strong>. Adelanta
            cobros o revisa gastos antes de llegar.
          </p>
        </div>
      ) : null}

      {/* Provisión de impuestos: lo que ya no es tuyo aunque esté en el banco */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Provisión de impuestos · {quarter.label}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="IVA a pagar (303)"
              value={formatMoney(quarter.vatDue)}
              hint={
                quarter.vatDue < 0
                  ? "sale a compensar"
                  : `${formatMoney(quarter.vatCharged)} repercutido − ${formatMoney(quarter.vatPaid)} soportado`
              }
              accent={quarter.vatDue > 0}
            />
            <StatCard
              label="IRPF a cuenta (130)"
              value={formatMoney(quarter.irpfDue)}
              hint="20% del rendimiento del trimestre"
              accent={quarter.irpfDue > 0}
            />
            <StatCard
              label="Total a provisionar"
              value={formatMoney(Math.max(0, quarter.vatDue) + quarter.irpfDue)}
              hint="apártalo antes de gastarlo"
            />
            <StatCard
              label="Rendimiento del trimestre"
              value={formatMoney(quarter.profit)}
              hint={`${formatMoney(quarter.incomeNet)} − ${formatMoney(quarter.expenseNet)} de gastos`}
            />
          </div>
          <p className="mt-4 text-xs text-faint">
            Del {formatDate(quarter.from)} al {formatDate(quarter.to)} ·{" "}
            {quarter.invoiceCount} facturas y {quarter.expenseCount} gastos.{" "}
            <strong className="text-mist">
              Es una estimación con los datos de KAIRAS, no sustituye a tu
              gestoría
            </strong>
            : no contempla bienes de inversión, prorrata ni cuotas de autónomos.
          </p>
        </CardBody>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pendiente de cobro"
          value={formatMoney(now.pendingCollections)}
          hint="facturas emitidas sin cobrar"
          href="/finance"
        />
        <StatCard
          label="Vencido sin cobrar"
          value={formatMoney(now.overdueCollections)}
          hint={now.overdueCollections > 0 ? "reclámalo primero" : "nada vencido"}
          accent={now.overdueCollections > 0}
        />
        <StatCard
          label="Gasto mensual medio"
          value={formatMoney(now.monthlyExpenseRate)}
          hint="media de los 3 últimos meses"
          href="/expenses"
        />
        <StatCard
          label="Caja a 6 meses"
          value={formatMoney(horizonNet)}
          hint="acumulado previsto"
          accent={horizonNet < 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previsión mes a mes</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Mes</TH>
                  <TH className="text-right">Recurrentes</TH>
                  <TH className="text-right">Facturas</TH>
                  <TH className="text-right">Pipeline</TH>
                  <TH className="text-right">Ingresos</TH>
                  <TH className="text-right">Gastos</TH>
                  <TH className="text-right">Neto</TH>
                  <TH className="text-right">Acumulado</TH>
                </tr>
              </THead>
              <TBody>
                {months.map((m) => (
                  <TR key={m.key}>
                    <TD className="font-semibold text-foam">{m.label}</TD>
                    <TD className="text-right text-mist">{formatMoney(m.recurring)}</TD>
                    <TD className="text-right text-mist">{formatMoney(m.invoices)}</TD>
                    <TD className="text-right text-faint">{formatMoney(m.pipeline)}</TD>
                    <TD className="text-right text-mist">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="hidden h-1.5 rounded-full bg-violet/60 lg:block"
                          style={{ width: `${Math.round((m.income / maxAbs) * 56)}px` }}
                          aria-hidden
                        />
                        {formatMoney(m.income)}
                      </span>
                    </TD>
                    <TD className="text-right text-mist">−{formatMoney(m.expenses)}</TD>
                    <TD
                      className={cn(
                        "text-right font-semibold",
                        m.net < 0 ? "text-danger" : "text-ok",
                      )}
                    >
                      {formatMoney(m.net)}
                    </TD>
                    <TD
                      className={cn(
                        "text-right font-semibold",
                        m.cumulative < 0 ? "text-danger" : "text-foam",
                      )}
                    >
                      {formatMoney(m.cumulative)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {months.map((m) => (
              <li key={m.key} className="rounded-xl border border-line bg-ink p-3.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foam">{m.label}</p>
                  <p
                    className={cn(
                      "font-semibold",
                      m.net < 0 ? "text-danger" : "text-ok",
                    )}
                  >
                    {formatMoney(m.net)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-faint">
                  {formatMoney(m.income)} entra · {formatMoney(m.expenses)} sale ·
                  acumulado {formatMoney(m.cumulative)}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 text-xs text-faint">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong className="text-mist">Recurrentes</strong> proyecta los
              cobros reales según su periodicidad (un servicio anual entra de
              golpe en su mes, no repartido).{" "}
              <strong className="text-mist">Facturas</strong> se colocan en su
              vencimiento; las ya vencidas caen en el mes en curso.{" "}
              <strong className="text-mist">Pipeline</strong> va ponderado por
              probabilidad: es la parte más incierta.{" "}
              <strong className="text-mist">Gastos</strong> usa la media de los
              tres últimos meses.
            </span>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
