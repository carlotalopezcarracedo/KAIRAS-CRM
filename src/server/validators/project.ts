import { z } from "zod";
import { parseMadridLocal } from "@/lib/dates";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : parseMadridLocal(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Fecha no válida",
  });

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional()
  .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
    message: "Número no válido",
  });

export const PROJECT_STATUSES = [
  "not_started",
  "discovery",
  "planning",
  "design",
  "development",
  "review",
  "delivery",
  "support",
  "blocked",
  "completed",
  "cancelled",
] as const;

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio"),
  clientId: z.string().trim().min(1, "El proyecto necesita un cliente"),
  mainServiceId: optionalText,
  proposalId: optionalText,
  status: z.enum(PROJECT_STATUSES).default("not_started"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  billingMode: z.enum(["fixed", "hourly", "retainer", "mixed"]).default("fixed"),
  startAt: optionalDate,
  deadline: optionalDate,
  budget: optionalNumber,
  hourlyRate: optionalNumber, // crea/actualiza la tarifa del proyecto
  estimatedMargin: optionalNumber.refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    { message: "Entre 0 y 100" },
  ),
  description: optionalText,
  scope: optionalText,
  outOfScope: optionalText,
  deliverables: optionalText,
  nextSteps: optionalText,
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  name: z.string().trim().min(2).optional(),
  clientId: z.string().trim().min(1).optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
