import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional()
  .refine((v) => v === undefined || z.email().safeParse(v).success, {
    message: "Email no válido",
  });

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v), {
    message: "Número no válido",
  });

export const CLIENT_STATUSES = [
  "active",
  "paused",
  "completed",
  "recurring",
  "inactive",
  "archived",
] as const;

export const clientCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
  status: z.enum(CLIENT_STATUSES).default("active"),
  vatId: optionalText,
  billingEmail: optionalEmail,
  phone: optionalText,
  address: optionalText,
  city: optionalText,
  province: optionalText,
  odooPartnerId: optionalText,
  satisfaction: optionalNumber.refine(
    (v) => v === undefined || (v >= 1 && v <= 5),
    { message: "Entre 1 y 5" },
  ),
  notes: optionalText,
});

export const clientUpdateSchema = clientCreateSchema.partial().extend({
  name: z.string().trim().min(2, "El nombre es obligatorio").optional(),
});

export const contactCreateSchema = z.object({
  firstName: z.string().trim().min(2, "Nombre obligatorio"),
  lastName: optionalText,
  role: optionalText,
  phone: optionalText,
  email: optionalEmail,
  instagram: optionalText,
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
