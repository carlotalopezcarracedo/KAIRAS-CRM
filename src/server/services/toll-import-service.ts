import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { getExpenseDefaults } from "@/server/services/settings-service";
import { OdooReadOnlyClient, OdooReadOnlyError } from "@/integrations/odoo/adapter";
import type { OdooVendorBill } from "@/integrations/odoo/adapter";

export type TollImportResult = {
  scanned: number;
  matched: number;
  imported: number;
  skipped: number;
  truncated: boolean;
};

// Diacriticos combinantes (U+0300-U+036F). Se construye con escapes ASCII:
// escribir el rango con caracteres literales lo corrompe al guardar y deja
// un rango invalido que revienta en tiempo de ejecucion.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza para comparar proveedores sin depender de tildes ni mayusculas. */
function normalize(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

export function isTollSupplier(
  supplierName: string,
  needles: readonly string[],
): boolean {
  const haystack = normalize(supplierName);
  return needles.some((needle) => needle && haystack.includes(normalize(needle)));
}

/** Convierte una factura de proveedor en los datos de un gasto de peaje. */
export function tollExpenseData(bill: OdooVendorBill) {
  const sign = bill.isRefund ? -1 : 1;
  return {
    kind: "toll" as const,
    source: "odoo" as const,
    odooMoveId: bill.id,
    odooRef: bill.number,
    description: bill.isRefund
      ? `Abono peajes ${bill.supplierName}`
      : `Peajes ${bill.supplierName}`,
    supplier: bill.supplierName,
    amountNet: sign * bill.amountUntaxed,
    vatAmount: sign * bill.amountTax,
    amountTotal: sign * bill.amountTotal,
    currency: bill.currency,
    // Odoo entrega la fecha como YYYY-MM-DD; sin fecha no se puede imputar.
    expenseAt: bill.invoiceDate ? new Date(`${bill.invoiceDate}T12:00:00Z`) : null,
  };
}

/** Facturas de proveedor que deben convertirse en gasto de peaje. */
export function selectTollBills(
  bills: readonly OdooVendorBill[],
  tollSuppliers: readonly string[],
): OdooVendorBill[] {
  return bills.filter(
    (bill) =>
      bill.state !== "draft" &&
      bill.state !== "cancel" &&
      isTollSupplier(bill.supplierName, tollSuppliers),
  );
}

/**
 * Trae de Odoo las facturas de proveedor de peajes y las registra como gastos.
 *
 * Reimportar es seguro: `odooMoveId` es unico, asi que una factura ya traida
 * se cuenta como omitida en vez de duplicarse.
 */
export async function importTollExpenses(
  userId: string,
  limit = 200,
): Promise<TollImportResult> {
  const defaults = await getExpenseDefaults();
  const client = new OdooReadOnlyClient();
  const { bills, truncated } = await client.listVendorBills(limit);

  const candidates = selectTollBills(bills, defaults.tollSuppliers);

  let imported = 0;
  let skipped = 0;

  for (const bill of candidates) {
    const data = tollExpenseData(bill);
    if (!data.expenseAt) {
      skipped += 1;
      continue;
    }

    // Se deja que el indice unico resuelva el duplicado, en vez de consultar
    // antes y crear despues: asi dos importaciones a la vez no se pisan.
    const created = await prisma.expenseRecord.createMany({
      data: [{ ...data, expenseAt: data.expenseAt, userId }],
      skipDuplicates: true,
    });

    if (created.count > 0) imported += 1;
    else skipped += 1;
  }

  await audit({
    actorId: userId,
    action: "create",
    entityType: "ExpenseRecord",
    metadata: {
      tollImport: true,
      scanned: bills.length,
      matched: candidates.length,
      imported,
      skipped,
    },
  });

  return {
    scanned: bills.length,
    matched: candidates.length,
    imported,
    skipped,
    truncated,
  };
}

/** Mensaje legible para la interfaz cuando Odoo no responde. */
export function describeOdooError(error: unknown): string {
  if (error instanceof OdooReadOnlyError) return error.message;
  return "No se han podido leer los peajes desde Odoo.";
}
