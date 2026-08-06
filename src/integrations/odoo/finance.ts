import {
  getOdooConfig,
  OdooReadOnlyClient,
  OdooReadOnlyError,
  type OdooInvoice,
  type OdooReadErrorCode,
} from "./adapter";

export type OdooCurrencyTotals = {
  currency: string;
  invoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
};

export type OdooFinancialSummary = {
  currencies: OdooCurrencyTotals[];
  records: number;
  posted: number;
  drafts: number;
  creditNotes: number;
};

export type OdooFinancialSnapshot =
  | {
      ok: true;
      invoices: OdooInvoice[];
      summary: OdooFinancialSummary;
      truncated: boolean;
      fetchedAt: string;
    }
  | {
      ok: false;
      code: OdooReadErrorCode;
      message: string;
    };

function isOverdue(invoice: OdooInvoice, today: string): boolean {
  return (
    invoice.type === "invoice" &&
    invoice.state === "posted" &&
    invoice.amountResidual > 0 &&
    Boolean(invoice.dueDate && invoice.dueDate < today)
  );
}

export function buildOdooFinancialSummary(
  invoices: OdooInvoice[],
  today = new Date().toISOString().slice(0, 10),
): OdooFinancialSummary {
  const byCurrency = new Map<string, OdooCurrencyTotals>();
  let posted = 0;
  let drafts = 0;
  let creditNotes = 0;

  for (const invoice of invoices) {
    if (invoice.state === "posted") posted += 1;
    if (invoice.state === "draft") drafts += 1;
    if (invoice.type === "credit_note") creditNotes += 1;
    if (invoice.state !== "posted") continue;

    const totals = byCurrency.get(invoice.currency) ?? {
      currency: invoice.currency,
      invoiced: 0,
      collected: 0,
      outstanding: 0,
      overdue: 0,
    };
    const sign = invoice.type === "credit_note" ? -1 : 1;
    totals.invoiced += sign * invoice.amountTotal;
    totals.collected +=
      sign * Math.max(invoice.amountTotal - invoice.amountResidual, 0);
    totals.outstanding += sign * invoice.amountResidual;
    if (isOverdue(invoice, today)) totals.overdue += invoice.amountResidual;
    byCurrency.set(invoice.currency, totals);
  }

  return {
    currencies: [...byCurrency.values()].sort((a, b) =>
      a.currency.localeCompare(b.currency),
    ),
    records: invoices.length,
    posted,
    drafts,
    creditNotes,
  };
}

export async function getOdooFinancialSnapshot(
  limit = 200,
): Promise<OdooFinancialSnapshot> {
  const config = getOdooConfig();
  if (!config.apiConfigured) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message:
        config.mode === "api"
          ? "Faltan ODOO_BASE_URL u ODOO_API_KEY en este entorno."
          : "La integración de Odoo no está activada en modo API.",
    };
  }

  try {
    const page = await new OdooReadOnlyClient().listCustomerInvoices(limit);
    return {
      ok: true,
      invoices: page.invoices,
      summary: buildOdooFinancialSummary(page.invoices),
      truncated: page.truncated,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof OdooReadOnlyError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "No se han podido consultar los datos financieros de Odoo.",
    };
  }
}
