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

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "followed_up",
  "accepted",
  "rejected",
  "expired",
  "archived",
] as const;

export const proposalSchema = z
  .object({
    title: z.string().trim().min(2, "El título es obligatorio"),
    status: z.enum(PROPOSAL_STATUSES).default("draft"),

    // Destinataria: lead (aún no es cliente) o cliente ya existente.
    leadId: optionalText,
    clientId: optionalText,
    opportunityId: optionalText,

    amountNet: optionalNumber,
    vatRate: optionalNumber.transform((v) => v ?? 21),

    sentAt: optionalDate,
    validUntil: optionalDate,
    documentUrl: optionalText,
    conditions: optionalText,
    rejectedReason: optionalText,
    notes: optionalText,
  })
  .refine((v) => !(v.validUntil && v.sentAt && v.validUntil < v.sentAt), {
    message: "La validez no puede ser anterior al envío",
    path: ["validUntil"],
  })
  .refine((v) => v.status !== "rejected" || !!v.rejectedReason, {
    message: "Indica el motivo del rechazo",
    path: ["rejectedReason"],
  });

export type ProposalInput = z.infer<typeof proposalSchema>;
