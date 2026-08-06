import { CircleAlert, Cloud, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type {
  OdooCurrencyTotals,
  OdooFinancialSnapshot,
} from "@/integrations/odoo/finance";
import type { OdooInvoice } from "@/integrations/odoo/adapter";
import type { Tone } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY?.trim() || "EUR";
const moneyFormatters = new Map<string, Intl.NumberFormat>();

function formatCurrency(value: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      });
    } catch {
      return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })} ${currency}`;
    }
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

function formatBreakdown(
  currencies: OdooCurrencyTotals[],
  field: keyof Pick<
    OdooCurrencyTotals,
    "invoiced" | "collected" | "outstanding" | "overdue"
  >,
): string {
  if (currencies.length === 0) return formatCurrency(0, DEFAULT_CURRENCY);
  return currencies
    .map((totals) => formatCurrency(totals[field], totals.currency))
    .join(" · ");
}

const stateLabels: Record<string, string> = {
  draft: "Borrador",
  posted: "Emitida",
  cancel: "Cancelada",
};

const stateTones: Record<string, Tone> = {
  draft: "neutral",
  posted: "ok",
  cancel: "danger",
};

const paymentLabels: Record<string, string> = {
  not_paid: "Pendiente",
  in_payment: "En proceso",
  paid: "Cobrada",
  partial: "Parcial",
  reversed: "Revertida",
  blocked: "Bloqueada",
};

const paymentTones: Record<string, Tone> = {
  not_paid: "warn",
  in_payment: "info",
  paid: "ok",
  partial: "warn",
  reversed: "neutral",
  blocked: "danger",
};

function InvoiceTypeBadge({ invoice }: { invoice: OdooInvoice }) {
  return invoice.type === "credit_note" ? (
    <Badge tone="violet">Rectificativa</Badge>
  ) : null;
}

export function OdooFinancialPanel({
  snapshot,
}: {
  snapshot: OdooFinancialSnapshot;
}) {
  if (!snapshot.ok) {
    return (
      <Card id="odoo-readonly" className="border-danger/25">
        <CardBody className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-foam">
              No se han podido leer las finanzas de Odoo
            </p>
            <p className="mt-1 text-sm text-mist">{snapshot.message}</p>
            <p className="mt-2 text-xs text-faint">
              KAIRAS no ha enviado ninguna operación de escritura.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { summary } = snapshot;

  return (
    <section id="odoo-readonly" aria-labelledby="odoo-finance-title">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="odoo-finance-title" className="text-lg font-bold text-foam">
              Finanzas reales de Odoo
            </h2>
            <Badge tone="ok">
              <Cloud className="h-3 w-3" /> Conectado
            </Badge>
            <Badge tone="violet">
              <ShieldCheck className="h-3 w-3" /> Solo lectura
            </Badge>
          </div>
          <p className="mt-1 text-sm text-mist">
            Datos consultados en vivo. KAIRAS no guarda ni modifica estos registros.
          </p>
        </div>
        <p className="text-xs text-faint">
          Actualizado {formatDateTime(snapshot.fetchedAt)}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Facturado en Odoo"
          value={formatBreakdown(summary.currencies, "invoiced")}
          hint={`${summary.posted} facturas emitidas`}
        />
        <StatCard
          label="Cobrado"
          value={formatBreakdown(summary.currencies, "collected")}
          hint="Calculado con el saldo pendiente de Odoo"
        />
        <StatCard
          label="Pendiente de cobro"
          value={formatBreakdown(summary.currencies, "outstanding")}
          hint="Facturas emitidas y rectificativas"
          accent={summary.currencies.some((item) => item.outstanding > 0)}
        />
        <StatCard
          label="Vencido"
          value={formatBreakdown(summary.currencies, "overdue")}
          hint="Saldo con fecha de vencimiento superada"
          accent={summary.currencies.some((item) => item.overdue > 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Facturas de cliente ({summary.records})</CardTitle>
            <p className="mt-1 text-xs text-faint">
              {summary.drafts} borradores · {summary.creditNotes} rectificativas
              {snapshot.truncated
                ? " · mostrando el límite más reciente"
                : " · listado completo recibido"}
            </p>
          </div>
        </CardHeader>
        <CardBody>
          {snapshot.invoices.length === 0 ? (
            <p className="text-sm text-faint">
              Odoo no ha devuelto facturas de cliente visibles para este usuario.
            </p>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Factura</TH>
                  <TH>Cliente</TH>
                  <TH className="hidden md:table-cell">Fecha</TH>
                  <TH className="hidden lg:table-cell">Vencimiento</TH>
                  <TH>Estado</TH>
                  <TH className="hidden sm:table-cell">Cobro</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="hidden text-right xl:table-cell">Pendiente</TH>
                </TR>
              </THead>
              <TBody>
                {snapshot.invoices.map((invoice) => (
                  <TR
                    key={invoice.id}
                    className="[content-visibility:auto] [contain-intrinsic-size:0_53px]"
                  >
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-foam">
                          {invoice.number}
                        </span>
                        <InvoiceTypeBadge invoice={invoice} />
                      </div>
                      {invoice.reference ? (
                        <p className="mt-0.5 max-w-52 truncate text-xs text-faint">
                          {invoice.reference}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="max-w-56 truncate text-mist">
                      {invoice.customerName}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-mist md:table-cell">
                      {formatDate(invoice.invoiceDate)}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-mist lg:table-cell">
                      {formatDate(invoice.dueDate)}
                    </TD>
                    <TD>
                      <Badge tone={stateTones[invoice.state] ?? "neutral"}>
                        {stateLabels[invoice.state] ?? invoice.state}
                      </Badge>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      {invoice.paymentState ? (
                        <Badge
                          tone={paymentTones[invoice.paymentState] ?? "neutral"}
                        >
                          {paymentLabels[invoice.paymentState] ??
                            invoice.paymentState}
                        </Badge>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-right font-semibold text-foam">
                      {formatCurrency(invoice.amountTotal, invoice.currency)}
                    </TD>
                    <TD className="hidden whitespace-nowrap text-right text-mist xl:table-cell">
                      {formatCurrency(invoice.amountResidual, invoice.currency)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

export function OdooFinancialPanelSkeleton() {
  return (
    <section aria-label="Cargando datos financieros de Odoo">
      <div className="mb-4">
        <div className="h-6 w-56 animate-pulse rounded bg-raise" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-raise" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-card border border-line bg-surface"
          />
        ))}
      </div>
    </section>
  );
}
