import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

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

export const CALENDAR_EVENT_TYPES = [
  "meeting",
  "call",
  "task",
  "deadline",
  "follow_up",
  "delivery",
  "time_block",
  "personal",
  "other",
] as const;

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(2, "El título es obligatorio"),
    type: z.enum(CALENDAR_EVENT_TYPES).default("meeting"),
    startAt: requiredDate,
    endAt: optionalDate,
    allDay: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    description: optionalText,
    location: optionalText,
    leadId: optionalText,
    clientId: optionalText,
    projectId: optionalText,
  })
  .refine((data) => !data.endAt || data.endAt >= data.startAt, {
    message: "El fin debe ser posterior al inicio",
    path: ["endAt"],
  });

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
