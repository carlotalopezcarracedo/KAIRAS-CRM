import { z } from "zod";
import { parseMadridLocal } from "@/lib/dates";

/** Convierte "" en undefined (los formularios envían strings vacíos). */
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

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "responded",
  "interested",
  "meeting_scheduled",
  "diagnosis_done",
  "proposal_needed",
  "proposal_sent",
  "follow_up",
  "negotiation",
  "postponed",
  "won",
  "lost",
  "nurture",
  "client_active",
  "client_inactive",
  "do_not_contact",
] as const;

export const TEMPERATURES = ["cold", "warm", "hot", "urgent"] as const;

export const LEAD_SOURCES = [
  "instagram_cold",
  "instagram_inbound",
  "meta_ads",
  "website",
  "whatsapp",
  "referral",
  "door_to_door",
  "cold_call",
  "email",
  "linkedin",
  "existing_client",
  "networking",
  "other",
] as const;

export const CONSENT_STATUSES = [
  "unknown",
  "legitimate_interest",
  "explicit_consent",
  "withdrawn",
  "do_not_contact",
] as const;

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio (mín. 2 caracteres)"),
  contact: optionalText,
  role: optionalText,
  phone: optionalText,
  email: optionalEmail,
  instagram: optionalText,
  website: optionalText,
  city: optionalText,
  province: optionalText,
  sector: optionalText,
  status: z.enum(LEAD_STATUSES).default("new"),
  temperature: z.enum(TEMPERATURES).default("cold"),
  source: z.enum(LEAD_SOURCES).default("other"),
  consentStatus: z.enum(CONSENT_STATUSES).default("unknown"),
  painDetected: optionalText,
  potentialService: optionalText,
  serviceId: optionalText,
  estimatedBudget: optionalNumber,
  probability: optionalNumber.refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    { message: "Debe estar entre 0 y 100" },
  ),
  objections: optionalText,
  internalNotes: optionalText,
  nextAction: optionalText,
  nextActionAt: optionalDate,
  utmSource: optionalText,
  utmMedium: optionalText,
  utmCampaign: optionalText,
  utmContent: optionalText,
  campaignId: optionalText,
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  name: z
    .string()
    .trim()
    .min(2, "El nombre es obligatorio (mín. 2 caracteres)")
    .optional(),
  lostReason: optionalText,
});

export const leadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  lostReason: optionalText,
});

export const INTERACTION_CHANNELS = [
  "call",
  "whatsapp",
  "email",
  "instagram",
  "linkedin",
  "meeting",
  "video_call",
  "in_person",
  "website_form",
  "other",
] as const;

export const interactionCreateSchema = z.object({
  channel: z.enum(INTERACTION_CHANNELS),
  direction: z.enum(["outbound", "inbound"]).default("outbound"),
  summary: z.string().trim().min(2, "Escribe un resumen"),
  detail: optionalText,
  occurredAt: optionalDate,
  nextAction: optionalText,
  nextActionAt: optionalDate,
});

export const noteCreateSchema = z.object({
  title: optionalText,
  content: z.string().trim().min(1, "La nota no puede estar vacía"),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type InteractionCreateInput = z.infer<typeof interactionCreateSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;

/** Filtros de la lista de leads (querystring). */
export const leadFiltersSchema = z.object({
  q: optionalText,
  status: z.enum(LEAD_STATUSES).optional().catch(undefined),
  temperature: z.enum(TEMPERATURES).optional().catch(undefined),
  source: z.enum(LEAD_SOURCES).optional().catch(undefined),
});
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
