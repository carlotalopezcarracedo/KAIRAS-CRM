import { describe, it, expect } from "vitest";
import {
  isTollSupplier,
  selectTollBills,
  tollExpenseData,
} from "./toll-import-service";
import type { OdooVendorBill } from "@/integrations/odoo/adapter";

function bill(overrides: Partial<OdooVendorBill> = {}): OdooVendorBill {
  return {
    id: 1,
    number: "FP/2026/0001",
    isRefund: false,
    state: "posted",
    invoiceDate: "2026-07-31",
    supplierName: "Beep&Drive",
    reference: null,
    amountUntaxed: 100,
    amountTax: 21,
    amountTotal: 121,
    currency: "EUR",
    ...overrides,
  };
}

describe("isTollSupplier", () => {
  it("reconoce al proveedor sin importar mayúsculas", () => {
    expect(isTollSupplier("BEEP&DRIVE S.L.", ["beep"])).toBe(true);
    expect(isTollSupplier("beep&drive", ["beep"])).toBe(true);
  });

  it("ignora las tildes al comparar", () => {
    expect(isTollSupplier("Peajes Autopistá", ["autopista"])).toBe(true);
  });

  it("no confunde a otros proveedores", () => {
    expect(isTollSupplier("Repsol", ["beep"])).toBe(false);
    expect(isTollSupplier("Movistar", ["beep", "via-t"])).toBe(false);
  });

  it("con la lista vacía no reconoce nada", () => {
    expect(isTollSupplier("Beep&Drive", [])).toBe(false);
  });

  it("una entrada vacía no hace que coincida todo", () => {
    expect(isTollSupplier("Repsol", [""])).toBe(false);
  });
});

describe("selectTollBills", () => {
  it("descarta borradores y canceladas", () => {
    const bills = [
      bill({ id: 1, state: "posted" }),
      bill({ id: 2, state: "draft" }),
      bill({ id: 3, state: "cancel" }),
    ];
    expect(selectTollBills(bills, ["beep"]).map((b) => b.id)).toEqual([1]);
  });

  it("descarta proveedores que no son de peaje", () => {
    const bills = [bill({ id: 1 }), bill({ id: 2, supplierName: "Repsol" })];
    expect(selectTollBills(bills, ["beep"]).map((b) => b.id)).toEqual([1]);
  });
});

describe("tollExpenseData", () => {
  it("traduce una factura a gasto de peaje", () => {
    const data = tollExpenseData(bill());
    expect(data.kind).toBe("toll");
    expect(data.source).toBe("odoo");
    expect(data.odooMoveId).toBe(1);
    expect(data.amountTotal).toBe(121);
    expect(data.expenseAt?.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("un abono resta en vez de sumar", () => {
    const data = tollExpenseData(bill({ isRefund: true }));
    expect(data.amountTotal).toBe(-121);
    expect(data.amountNet).toBe(-100);
    expect(data.description).toContain("Abono");
  });

  it("sin fecha no se puede imputar", () => {
    expect(tollExpenseData(bill({ invoiceDate: null })).expenseAt).toBeNull();
  });
});
