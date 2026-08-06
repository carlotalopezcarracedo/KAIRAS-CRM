import { describe, expect, it } from "vitest";
import type { OdooInvoice } from "./adapter";
import { buildOdooFinancialSummary } from "./finance";

function invoice(overrides: Partial<OdooInvoice> = {}): OdooInvoice {
  return {
    id: 1,
    number: "INV/2026/0001",
    type: "invoice",
    state: "posted",
    paymentState: "not_paid",
    invoiceDate: "2026-01-10",
    dueDate: "2026-02-10",
    customerName: "Cliente",
    reference: null,
    amountUntaxed: 100,
    amountTax: 21,
    amountTotal: 121,
    amountResidual: 121,
    currency: "EUR",
    ...overrides,
  };
}

describe("resumen financiero Odoo", () => {
  it("calcula cobrado, pendiente y vencido solo sobre facturas emitidas", () => {
    const summary = buildOdooFinancialSummary(
      [
        invoice({ id: 1, amountResidual: 21 }),
        invoice({ id: 2, state: "draft", amountTotal: 500 }),
        invoice({
          id: 3,
          dueDate: "2026-12-31",
          amountTotal: 242,
          amountResidual: 242,
        }),
      ],
      "2026-08-06",
    );

    expect(summary.posted).toBe(2);
    expect(summary.drafts).toBe(1);
    expect(summary.currencies[0]).toMatchObject({
      invoiced: 363,
      collected: 100,
      outstanding: 263,
      overdue: 21,
    });
  });

  it("resta las rectificativas de los totales", () => {
    const summary = buildOdooFinancialSummary([
      invoice({ id: 1, amountTotal: 200, amountResidual: 0 }),
      invoice({
        id: 2,
        type: "credit_note",
        amountTotal: 50,
        amountResidual: 0,
      }),
    ]);

    expect(summary.creditNotes).toBe(1);
    expect(summary.currencies[0]).toMatchObject({
      invoiced: 150,
      collected: 150,
      outstanding: 0,
    });
  });

  it("mantiene separadas las divisas", () => {
    const summary = buildOdooFinancialSummary([
      invoice({ id: 1, currency: "EUR" }),
      invoice({ id: 2, currency: "USD" }),
    ]);

    expect(summary.currencies.map((item) => item.currency)).toEqual([
      "EUR",
      "USD",
    ]);
  });
});
