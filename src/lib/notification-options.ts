// Opciones de Ajustes → Notificaciones. Viven aparte de settings-service
// porque el formulario (cliente) las necesita y ese módulo importa Prisma.

export type PriorityValue = "low" | "medium" | "high" | "urgent";

export const NOTIFICATION_PRIORITIES: PriorityValue[] = ["low", "medium", "high", "urgent"];

export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

/** Antelaciones ofrecidas (minutos antes de la hora; 0 = en el momento). */
export const NOTIFICATION_OFFSET_OPTIONS = [0, 5, 15, 30, 60, 120, 240, 1440, 2880, 10080] as const;

export function offsetLabel(minutes: number) {
  if (minutes === 0) return "En el momento";
  if (minutes < 60) return `${minutes} min antes`;
  if (minutes < 1440) return `${minutes / 60} h antes`;
  const days = minutes / 1440;
  if (days === 1) return "1 día antes";
  if (days === 7) return "1 semana antes";
  return `${days} días antes`;
}
