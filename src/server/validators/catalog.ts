import { z } from "zod";

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

const requiredDate = z
  .string()
  .trim()
  .min(1, "Obligatorio")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), { message: "Fecha no válida" });

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : new Date(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Fecha no válida",
  });

export const SERVICE_CATEGORIES = [
  "automation_ai",
  "custom_software",
  "website",
  "website_maintenance",
  "social_media_management",
  "content_creation",
  "meta_ads",
  "marketing_strategy",
  "branding_naming",
  "consulting",
  "audiovisual",
  "other",
] as const;

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
  category: z.enum(SERVICE_CATEGORIES).default("other"),
  description: optionalText,
  basePrice: optionalNumber,
  priceMin: optionalNumber,
  priceMax: optionalNumber,
  vatRate: optionalNumber.transform((v) => v ?? 21),
  billingUnit: z.enum(["project", "hour", "month", "piece", "other"]).default("project"),
  canBeRecurring: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  deliverables: optionalText,
  odooProductRef: optionalText,
  active: z
    .string()
    .optional()
    .transform((v) => v === undefined || v === "on" || v === "true"),
});

export const recurringSchema = z.object({
  clientId: z.string().trim().min(1, "Cliente obligatorio"),
  serviceId: z.string().trim().min(1, "Servicio obligatorio"),
  title: optionalText,
  amount: requiredNumber,
  periodicity: z
    .enum(["monthly", "quarterly", "yearly", "weekly", "custom"])
    .default("monthly"),
  status: z.enum(["active", "paused", "cancelled", "ended", "trial"]).default("active"),
  startedAt: requiredDate,
  endsAt: optionalDate,
  billingDay: optionalNumber
    .transform((v) => v ?? 1)
    .refine((v) => v >= 1 && v <= 28, {
      message: "Día entre 1 y 28 (evita meses cortos)",
    }),
  nextInvoiceAt: optionalDate,
  paymentMethod: optionalText,
  estimatedMargin: optionalNumber,
  notes: optionalText,
});

export type ServiceInput = z.infer<typeof serviceSchema>;
export type RecurringInput = z.infer<typeof recurringSchema>;
