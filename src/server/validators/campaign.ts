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

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : parseMadridLocal(v)))
  .optional()
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Fecha no válida",
  });

export const CAMPAIGN_CHANNELS = [
  "instagram_organic",
  "instagram_ads",
  "facebook_ads",
  "linkedin",
  "website",
  "whatsapp",
  "door_to_door",
  "cold_call",
  "referral",
  "email",
  "other",
] as const;

export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "finished",
  "archived",
] as const;

export const campaignSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio"),
    channel: z.enum(CAMPAIGN_CHANNELS).default("other"),
    status: z.enum(CAMPAIGN_STATUSES).default("draft"),
    objective: optionalText,

    startAt: optionalDate,
    endAt: optionalDate,

    budget: optionalNumber,
    spent: optionalNumber,
    manualCostPerLead: optionalNumber,

    promotedService: optionalText,
    url: optionalText,

    utmSource: optionalText,
    utmMedium: optionalText,
    utmCampaign: optionalText,
    utmContent: optionalText,

    notes: optionalText,
  })
  .refine((v) => !(v.startAt && v.endAt && v.endAt < v.startAt), {
    message: "El fin no puede ser anterior al inicio",
    path: ["endAt"],
  });

export type CampaignInput = z.infer<typeof campaignSchema>;
