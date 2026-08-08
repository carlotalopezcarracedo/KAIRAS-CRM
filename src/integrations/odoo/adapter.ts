import { z } from "zod";

/**
 * Odoo 19 JSON-2, deliberadamente limitado a lectura.
 *
 * La integración no expone un ejecutor RPC genérico: el único endpoint
 * permitido es `account.move/search_read`. No existen métodos create, write,
 * unlink ni acciones contables en este cliente.
 */

export type OdooMode = "api" | "csv" | "playwright";

export type OdooConfig = {
  mode: OdooMode;
  apiConfigured: boolean;
  baseUrl: string | null;
  db: string | null;
  username: string | null;
  protocol: "json2";
};

export type OdooInvoice = {
  id: number;
  number: string;
  type: "invoice" | "credit_note";
  state: string;
  paymentState: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  customerName: string;
  reference: string | null;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  amountResidual: number;
  currency: string;
};

export type OdooInvoicePage = {
  invoices: OdooInvoice[];
  truncated: boolean;
};

/** Factura de proveedor (compra). Origen de los peajes en KAIRAS. */
export type OdooVendorBill = {
  id: number;
  number: string;
  isRefund: boolean;
  state: string;
  invoiceDate: string | null;
  supplierName: string;
  reference: string | null;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  currency: string;
};

export type OdooVendorBillPage = {
  bills: OdooVendorBill[];
  truncated: boolean;
};

export type OdooReadErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_URL"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "UNAVAILABLE";

export class OdooReadOnlyError extends Error {
  constructor(
    readonly code: OdooReadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OdooReadOnlyError";
  }
}

const falseableString = z
  .union([z.string(), z.literal(false), z.null()])
  .transform((value) => (typeof value === "string" && value ? value : null));

const manyToOne = z
  .union([
    z.tuple([z.number().int(), z.string()]),
    z.literal(false),
    z.null(),
  ])
  .transform((value) => (Array.isArray(value) ? value : null));

const invoiceSchema = z.object({
  id: z.number().int(),
  name: falseableString,
  move_type: z.enum(["out_invoice", "out_refund", "in_invoice", "in_refund"]),
  state: z.string(),
  payment_state: falseableString,
  invoice_date: falseableString,
  invoice_date_due: falseableString,
  partner_id: manyToOne,
  ref: falseableString,
  amount_untaxed: z.number(),
  amount_tax: z.number(),
  amount_total: z.number(),
  amount_residual: z.number(),
  currency_id: manyToOne,
});

const invoiceListSchema = z.array(invoiceSchema);

const INVOICE_FIELDS = [
  "id",
  "name",
  "move_type",
  "state",
  "payment_state",
  "invoice_date",
  "invoice_date_due",
  "partner_id",
  "ref",
  "amount_untaxed",
  "amount_tax",
  "amount_total",
  "amount_residual",
  "currency_id",
] as const;

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY?.trim() || "EUR";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_INVOICES = 500;

function normalizeOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function normalizeDatabaseName(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || /^https?:\/\//i.test(candidate)) return null;
  return /^[a-zA-Z0-9_.-]+$/.test(candidate) ? candidate : null;
}

export function getOdooConfig(): OdooConfig {
  const rawMode = process.env.ODOO_INTEGRATION_MODE?.trim().toLowerCase();
  const mode: OdooMode =
    rawMode === "api" || rawMode === "playwright" ? rawMode : "csv";
  const baseUrl = normalizeOrigin(process.env.ODOO_BASE_URL);
  const apiKey = process.env.ODOO_API_KEY?.trim() || null;

  return {
    mode,
    apiConfigured: mode === "api" && Boolean(baseUrl && apiKey),
    baseUrl,
    db: normalizeDatabaseName(process.env.ODOO_DB),
    username: process.env.ODOO_USERNAME?.trim() || null,
    protocol: "json2",
  };
}

function userMessageForStatus(status: number): OdooReadOnlyError {
  if (status === 401) {
    return new OdooReadOnlyError(
      "UNAUTHORIZED",
      "Odoo ha rechazado la API key. Revísala o genera una nueva.",
    );
  }
  if (status === 403) {
    return new OdooReadOnlyError(
      "FORBIDDEN",
      "El usuario de la API no tiene permiso de lectura sobre Contabilidad.",
    );
  }
  if (status === 404) {
    return new OdooReadOnlyError(
      "NOT_FOUND",
      "Odoo no ha encontrado la API JSON-2 o la base indicada.",
    );
  }
  return new OdooReadOnlyError(
    "UNAVAILABLE",
    `Odoo no está disponible en este momento (HTTP ${status}).`,
  );
}

/** Cliente sin ninguna operación de escritura. */
export class OdooReadOnlyClient {
  private readonly config = getOdooConfig();
  private readonly apiKey = process.env.ODOO_API_KEY?.trim() || null;

  /**
   * Único punto de acceso: `account.move/search_read` acotado por move_type.
   * Sigue sin existir un ejecutor RPC genérico ni ninguna vía de escritura.
   */
  private async searchReadMoves(
    moveTypes: readonly string[],
    limit: number,
  ): Promise<{ rows: z.infer<typeof invoiceListSchema>; truncated: boolean }> {
    if (!this.config.apiConfigured || !this.config.baseUrl || !this.apiKey) {
      throw new OdooReadOnlyError(
        "NOT_CONFIGURED",
        "La API de Odoo no está configurada en modo lectura.",
      );
    }

    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), MAX_INVOICES);
    const headers: Record<string, string> = {
      Authorization: `bearer ${this.apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
    };
    if (this.config.db) headers["X-Odoo-Database"] = this.config.db;

    let response: Response;
    try {
      response = await fetch(
        `${this.config.baseUrl}/json/2/account.move/search_read`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            domain: [["move_type", "in", moveTypes]],
            fields: INVOICE_FIELDS,
            limit: safeLimit + 1,
            order: "invoice_date desc, id desc",
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new OdooReadOnlyError(
          "TIMEOUT",
          "Odoo ha tardado demasiado en responder.",
        );
      }
      throw new OdooReadOnlyError(
        "UNAVAILABLE",
        "No se ha podido conectar con Odoo.",
      );
    }

    if (!response.ok) throw userMessageForStatus(response.status);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new OdooReadOnlyError(
        "INVALID_RESPONSE",
        "Odoo ha devuelto una respuesta que KAIRAS no puede leer.",
      );
    }

    const parsed = invoiceListSchema.safeParse(payload);
    if (!parsed.success) {
      throw new OdooReadOnlyError(
        "INVALID_RESPONSE",
        "La estructura de las facturas recibidas desde Odoo no es válida.",
      );
    }

    return {
      rows: parsed.data.slice(0, safeLimit),
      truncated: parsed.data.length > safeLimit,
    };
  }

  async listCustomerInvoices(limit = 200): Promise<OdooInvoicePage> {
    const { rows, truncated } = await this.searchReadMoves(
      ["out_invoice", "out_refund"],
      limit,
    );

    const invoices = rows.map<OdooInvoice>((invoice) => ({
      id: invoice.id,
      number: invoice.name ?? `Factura ${invoice.id}`,
      type: invoice.move_type === "out_refund" ? "credit_note" : "invoice",
      state: invoice.state,
      paymentState: invoice.payment_state,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.invoice_date_due,
      customerName: invoice.partner_id?.[1] ?? "Sin cliente",
      reference: invoice.ref,
      amountUntaxed: invoice.amount_untaxed,
      amountTax: invoice.amount_tax,
      amountTotal: invoice.amount_total,
      amountResidual: invoice.amount_residual,
      currency: invoice.currency_id?.[1] ?? DEFAULT_CURRENCY,
    }));

    return { invoices, truncated };
  }

  /**
   * Facturas de proveedor. KAIRAS las usa para traer los peajes, que se
   * cargan en la cuenta de empresa y por tanto ya entran en Odoo.
   */
  async listVendorBills(limit = 200): Promise<OdooVendorBillPage> {
    const { rows, truncated } = await this.searchReadMoves(
      ["in_invoice", "in_refund"],
      limit,
    );

    const bills = rows.map<OdooVendorBill>((bill) => ({
      id: bill.id,
      number: bill.name ?? `Factura ${bill.id}`,
      // Un abono de proveedor resta: se refleja con el importe en negativo.
      isRefund: bill.move_type === "in_refund",
      state: bill.state,
      invoiceDate: bill.invoice_date,
      supplierName: bill.partner_id?.[1] ?? "Sin proveedor",
      reference: bill.ref,
      amountUntaxed: bill.amount_untaxed,
      amountTax: bill.amount_tax,
      amountTotal: bill.amount_total,
      currency: bill.currency_id?.[1] ?? DEFAULT_CURRENCY,
    }));

    return { bills, truncated };
  }
}
