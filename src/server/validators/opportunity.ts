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

export const OPPORTUNITY_STAGES = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
  "won",
  "lost",
  "paused",
] as const;

/** Etapas que cuentan como pipeline abierto. */
export const OPEN_STAGES = [
  "discovered",
  "qualified",
  "diagnosis",
  "proposal_drafting",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "accepted",
] as const;

export const opportunityCreateSchema = z.object({
  title: z.string().trim().min(2, "El título es obligatorio"),
  leadId: optionalText,
  clientId: optionalText,
  serviceId: optionalText,
  campaignId: optionalText,
  stage: z.enum(OPPORTUNITY_STAGES).default("discovered"),
  estimatedValue: optionalNumber,
  probability: optionalNumber.refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    { message: "Entre 0 y 100" },
  ),
  expectedCloseAt: optionalDate,
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  urgencyLevel: optionalNumber.refine(
    (v) => v === undefined || (v >= 1 && v <= 5),
    { message: "Entre 1 y 5" },
  ),
  kairasFit: optionalNumber.refine(
    (v) => v === undefined || (v >= 1 && v <= 5),
    { message: "Entre 1 y 5" },
  ),
  costOfInaction: optionalText,
  nextAction: optionalText,
  nextActionAt: optionalDate,
  observations: optionalText,
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial().extend({
  title: z.string().trim().min(2, "El título es obligatorio").optional(),
});

export const stageChangeSchema = z.object({
  stage: z.enum(OPPORTUNITY_STAGES),
  lostReason: optionalText,
  acceptedValue: optionalNumber,
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
export type StageChangeInput = z.infer<typeof stageChangeSchema>;
