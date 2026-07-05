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

export const TASK_TYPES = [
  "follow_up",
  "call",
  "meeting",
  "proposal",
  "invoice",
  "delivery",
  "review",
  "content",
  "admin",
  "technical",
  "other",
] as const;

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "waiting",
  "done",
  "cancelled",
] as const;

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2, "El título es obligatorio"),
  description: optionalText,
  type: z.enum(TASK_TYPES).default("other"),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: optionalDate,
  remindAt: optionalDate,
  estimatedHours: optionalNumber,
  billable: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  leadId: optionalText,
  clientId: optionalText,
  projectId: optionalText,
  opportunityId: optionalText,
  checklist: optionalText, // líneas separadas por \n
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  title: z.string().trim().min(2).optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

/** Convierte el textarea de checklist en JSON [{label, done}] */
export function parseChecklist(
  text: string | undefined,
  previous?: { label: string; done: boolean }[],
): { label: string; done: boolean }[] | undefined {
  if (text === undefined) return undefined;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((label) => ({
    label,
    done: previous?.find((p) => p.label === label)?.done ?? false,
  }));
}
