import { z } from "zod";
import { parseMadridLocal } from "@/lib/dates";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional()
  .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
    message: "Número no válido",
  });

const requiredNumber = z
  .string()
  .trim()
  .min(1, "Obligatorio")
  .transform((v) => Number(v))
  .refine((v) => !Number.isNaN(v) && v >= 0, { message: "Número no válido" });

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : parseMadridLocal(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Fecha no válida",
  });

/** Solicitud de factura manual (cola hacia Odoo). */
export const invoiceDraftSchema = z.object({
  clientId: z.string().trim().min(1, "Cliente obligatorio"),
  concept: z.string().trim().min(2, "Concepto obligatorio"),
  amountNet: requiredNumber,
  vatRate: optionalNumber.transform((v) => v ?? 21),
  notes: optionalText,
});

/** Solicitud de factura desde horas aprobadas. */
export const invoiceFromHoursSchema = z.object({
  clientId: z.string().trim().min(1, "Cliente obligatorio"),
  concept: optionalText,
  vatRate: optionalNumber.transform((v) => v ?? 21),
});

export const DRAFT_STATUSES = [
  "pending",
  "queued",
  "sent_to_odoo",
  "created_in_odoo",
  "error",
  "discarded",
] as const;

export const INVOICE_RECORD_STATUSES = [
  "draft_needed",
  "queued_for_odoo",
  "created_in_odoo",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  "error",
] as const;

/** Snapshot de factura real (la legal vive en Odoo). */
export const invoiceRecordSchema = z.object({
  clientId: optionalText,
  concept: z.string().trim().min(2, "Concepto obligatorio"),
  odooInvoiceNumber: optionalText,
  odooId: optionalText,
  odooUrl: optionalText,
  status: z.enum(INVOICE_RECORD_STATUSES).default("created_in_odoo"),
  amountNet: optionalNumber,
  vatAmount: optionalNumber,
  amountTotal: requiredNumber,
  issuedAt: optionalDate,
  dueAt: optionalDate,
  paidAt: optionalDate,
  notes: optionalText,
});

export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>;
export type InvoiceFromHoursInput = z.infer<typeof invoiceFromHoursSchema>;
export type InvoiceRecordInput = z.infer<typeof invoiceRecordSchema>;
