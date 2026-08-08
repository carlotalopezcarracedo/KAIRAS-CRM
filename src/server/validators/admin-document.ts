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

const optionalYear = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional()
  .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1990 && v <= 2100), {
    message: "Ejercicio no válido",
  });

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : parseMadridLocal(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Fecha no válida",
  });

export const ADMIN_DOC_CATEGORIES = [
  "alta_censal",
  "reta",
  "irpf_trimestral",
  "iva_trimestral",
  "iva_anual",
  "retenciones",
  "resumen_anual",
  "renta",
  "seguro",
  "contrato",
  "certificado_digital",
  "banco",
  "subvencion",
  "licencia",
  "otro",
] as const;

export const FISCAL_PERIODS = ["", "1T", "2T", "3T", "4T", "anual"] as const;

export const adminDocumentSchema = z
  .object({
    title: z.string().trim().min(2, "El título es obligatorio"),
    category: z.enum(ADMIN_DOC_CATEGORIES).default("otro"),
    fiscalYear: optionalYear,
    fiscalPeriod: optionalText,
    issuer: optionalText,
    reference: optionalText,
    amount: optionalNumber,
    issuedAt: optionalDate,
    validUntil: optionalDate,
    notes: optionalText,
  })
  .refine((v) => !(v.issuedAt && v.validUntil && v.validUntil < v.issuedAt), {
    message: "La caducidad no puede ser anterior a la emisión",
    path: ["validUntil"],
  });

export type AdminDocumentInput = z.infer<typeof adminDocumentSchema>;
