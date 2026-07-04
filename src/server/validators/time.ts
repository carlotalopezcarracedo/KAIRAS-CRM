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

export const WORK_TYPES = [
  "strategy",
  "sales",
  "meeting",
  "proposal",
  "web_design",
  "web_development",
  "automation",
  "ai_development",
  "crm_system",
  "debugging",
  "content_planning",
  "copywriting",
  "design",
  "video_editing",
  "social_media",
  "meta_ads",
  "admin",
  "accounting",
  "learning",
  "internal",
  "other",
] as const;

export const timerStartSchema = z.object({
  title: optionalText,
  clientId: optionalText,
  projectId: optionalText,
  taskId: optionalText,
  serviceId: optionalText,
  workType: z.enum(WORK_TYPES).default("other"),
  billable: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

const requiredDate = z
  .string()
  .trim()
  .min(1, "Obligatorio")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), { message: "Fecha no válida" });

export const timeEntryCreateSchema = z
  .object({
    title: optionalText,
    description: optionalText,
    workType: z.enum(WORK_TYPES).default("other"),
    startedAt: requiredDate,
    endedAt: requiredDate,
    clientId: optionalText,
    projectId: optionalText,
    taskId: optionalText,
    serviceId: optionalText,
    billable: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((v) => v === true || v === "on" || v === "true"),
    hourlyRate: optionalNumber, // tarifa manual opcional
  })
  .refine((data) => data.endedAt > data.startedAt, {
    message: "El fin debe ser posterior al inicio",
    path: ["endedAt"],
  })
  .refine(
    (data) =>
      data.endedAt.getTime() - data.startedAt.getTime() <= 24 * 3600 * 1000,
    { message: "Una entrada no puede durar más de 24 h", path: ["endedAt"] },
  );

export const timeEntryUpdateSchema = timeEntryCreateSchema;

export const TIME_ENTRY_STATUSES = [
  "draft",
  "reviewed",
  "approved",
  "queued_for_invoice",
  "invoiced",
  "non_billable",
  "written_off",
] as const;

export type TimerStartInput = z.infer<typeof timerStartSchema>;
export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
