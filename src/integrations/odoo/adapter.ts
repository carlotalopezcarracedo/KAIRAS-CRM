/**
 * Odoo — capa de integración.
 *
 * Tres modos (ODOO_INTEGRATION_MODE):
 * - "csv" (por defecto, funcional): export/import de CSVs compatibles con
 *   los importadores nativos de Odoo. No necesita credenciales.
 * - "api": cliente XML-RPC/JSON-RPC preparado pero desactivado sin
 *   credenciales (ODOO_BASE_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY).
 * - "playwright": fallback asistido. NO implementado a propósito: requiere
 *   autorización explícita y no debe tocar datos fiscales sin revisión.
 */

export type OdooMode = "api" | "csv" | "playwright";

export type OdooConfig = {
  mode: OdooMode;
  apiConfigured: boolean;
  baseUrl: string | null;
  db: string | null;
  username: string | null;
};

export function getOdooConfig(): OdooConfig {
  const rawMode = process.env.ODOO_INTEGRATION_MODE?.trim().toLowerCase();
  const mode: OdooMode =
    rawMode === "api" || rawMode === "playwright" ? rawMode : "csv";

  const baseUrl = process.env.ODOO_BASE_URL?.trim() || null;
  const db = process.env.ODOO_DB?.trim() || null;
  const username = process.env.ODOO_USERNAME?.trim() || null;
  const apiKey = process.env.ODOO_API_KEY?.trim() || null;

  return {
    mode,
    apiConfigured: !!(baseUrl && db && username && apiKey),
    baseUrl,
    db,
    username,
  };
}

/**
 * Cliente API de Odoo (JSON-RPC). Estructura preparada; cada método valida
 * la configuración y falla claro si no hay credenciales. No se usa en modo csv.
 */
export class OdooApiClient {
  private config = getOdooConfig();
  private uid: number | null = null;

  private assertConfigured() {
    if (!this.config.apiConfigured) {
      throw new Error(
        "ODOO_NOT_CONFIGURED: faltan ODOO_BASE_URL / ODOO_DB / ODOO_USERNAME / ODOO_API_KEY",
      );
    }
  }

  private async rpc(service: string, method: string, args: unknown[]) {
    this.assertConfigured();
    const response = await fetch(`${this.config.baseUrl}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { service, method, args },
        id: Date.now(),
      }),
    });
    if (!response.ok) throw new Error(`ODOO_HTTP_${response.status}`);
    const body = (await response.json()) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (body.error) throw new Error(`ODOO_RPC: ${body.error.message ?? "error"}`);
    return body.result;
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = (await this.rpc("common", "authenticate", [
      this.config.db,
      this.config.username,
      process.env.ODOO_API_KEY,
      {},
    ])) as number | false;
    if (!uid) throw new Error("ODOO_AUTH_FAILED");
    this.uid = uid;
    return uid;
  }

  private async execute(model: string, method: string, args: unknown[]) {
    const uid = await this.authenticate();
    return this.rpc("object", "execute_kw", [
      this.config.db,
      uid,
      process.env.ODOO_API_KEY,
      model,
      method,
      args,
    ]);
  }

  /** Lee contactos (res.partner). */
  async listPartners(limit = 100) {
    return this.execute("res.partner", "search_read", [
      [["is_company", "=", true]],
      ["id", "name", "vat", "email", "phone", "city"],
      0,
      limit,
    ]);
  }

  /** Crea un contacto. */
  async createPartner(data: {
    name: string;
    vat?: string;
    email?: string;
    phone?: string;
    city?: string;
  }) {
    return this.execute("res.partner", "create", [[data]]);
  }

  /** Lee facturas de cliente. */
  async listInvoices(limit = 100) {
    return this.execute("account.move", "search_read", [
      [["move_type", "=", "out_invoice"]],
      ["id", "name", "partner_id", "amount_total", "state", "payment_state"],
      0,
      limit,
    ]);
  }
}
