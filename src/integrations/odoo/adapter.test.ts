import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OdooReadOnlyClient } from "./adapter";

const odooRecord = {
  id: 42,
  name: "INV/2026/0042",
  move_type: "out_invoice",
  state: "posted",
  payment_state: "partial",
  invoice_date: "2026-08-01",
  invoice_date_due: "2026-08-31",
  partner_id: [7, "Cliente de prueba"],
  ref: false,
  amount_untaxed: 100,
  amount_tax: 21,
  amount_total: 121,
  amount_residual: 50,
  currency_id: [1, "EUR"],
};

describe("OdooReadOnlyClient", () => {
  beforeEach(() => {
    vi.stubEnv("ODOO_INTEGRATION_MODE", "api");
    vi.stubEnv("ODOO_BASE_URL", "https://example.odoo.com/odoo");
    vi.stubEnv("ODOO_DB", "https://example.odoo.com");
    vi.stubEnv("ODOO_USERNAME", "bot@example.com");
    vi.stubEnv("ODOO_API_KEY", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("solo llama al search_read fijo y normaliza el host", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify([odooRecord]), { status: 200 }),
      );

    const result = await new OdooReadOnlyClient().listCustomerInvoices(20);

    expect(result.invoices[0]).toMatchObject({
      id: 42,
      number: "INV/2026/0042",
      customerName: "Cliente de prueba",
      amountResidual: 50,
    });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://example.odoo.com/json/2/account.move/search_read",
    );
    expect(options?.method).toBe("POST");
    expect(options?.headers).not.toHaveProperty("X-Odoo-Database");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      domain: [["move_type", "in", ["out_invoice", "out_refund"]]],
      limit: 21,
    });
  });

  it("no expone métodos de escritura", () => {
    const client = new OdooReadOnlyClient() as unknown as Record<
      string,
      unknown
    >;

    expect(client.create).toBeUndefined();
    expect(client.write).toBeUndefined();
    expect(client.unlink).toBeUndefined();
    expect(client.createPartner).toBeUndefined();
  });

  it("rechaza respuestas que no cumplen el contrato financiero", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), { status: 200 }),
    );

    await expect(
      new OdooReadOnlyClient().listCustomerInvoices(),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
