import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import type { PriorityValue } from "@/lib/notification-options";
import { NOTIFICATION_PRIORITIES } from "@/lib/notification-options";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.settings.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

export async function setSetting(key: string, value: unknown) {
  await prisma.settings.upsert({
    where: { key },
    update: { value: value as Prisma.InputJsonValue },
    create: { key, value: value as Prisma.InputJsonValue },
  });
}

export type CompanyProfile = {
  brandName: string;
  legalName: string;
  vatId: string;
  email: string;
  phone: string;
  /** Domicilio fiscal: calle, número, piso. */
  address: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  /** Régimen: autónoma, sociedad… Aparece en documentos administrativos. */
  taxRegime: string;
  /** Epígrafe del IAE, útil al presentar modelos. */
  iaeCode: string;
  socialSecurityNumber: string;
  iban: string;
  web: string;
  instagram: string;
};

export const DEFAULT_COMPANY: CompanyProfile = {
  brandName: "KAIRAS",
  legalName: "",
  vatId: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  province: "",
  country: "España",
  taxRegime: "autonoma",
  iaeCode: "",
  socialSecurityNumber: "",
  iban: "",
  web: "",
  instagram: "",
};

/** Domicilio fiscal en una línea, para documentos y facturas. */
export function formatFiscalAddress(profile: CompanyProfile): string {
  const cityLine = [profile.postalCode, profile.city].filter(Boolean).join(" ");
  return [profile.address, cityLine, profile.province, profile.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export type AppDefaults = {
  currency: string;
  timezone: string;
  vatRate: number;
  timeRounding: number;
};

export const DEFAULT_APP: AppDefaults = {
  currency: "EUR",
  timezone: "Europe/Madrid",
  vatRate: 21,
  timeRounding: 0,
};

export type ExpenseDefaults = {
  /** €/km del desplazamiento en coche propio. */
  ratePerKm: number;
  /** Dieta por día sin pernocta. */
  perDiemDay: number;
  /** Dieta por día con pernocta. */
  perDiemOvernight: number;
  /**
   * Fragmentos de nombre de proveedor que identifican peajes en Odoo.
   * Se comparan en minúsculas y sin acentos contra el nombre del proveedor.
   */
  tollSuppliers: string[];
};

/**
 * Importes exentos de IRPF vigentes en España para desplazamiento en vehículo
 * propio y dietas nacionales. Son el tope legal, no una obligación: se pueden
 * cambiar en Ajustes.
 */
export const DEFAULT_EXPENSES: ExpenseDefaults = {
  ratePerKm: 0.26,
  perDiemDay: 26.67,
  perDiemOvernight: 53.34,
  tollSuppliers: ["beep"],
};

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const stored = await getSetting<Partial<CompanyProfile>>("company.profile", {});
  // Mezcla con los valores por defecto: los perfiles guardados antes de que
  // existieran los campos fiscales no tienen esas claves.
  return { ...DEFAULT_COMPANY, ...stored };
}

export function getAppDefaults() {
  return getSetting<AppDefaults>("app.defaults", DEFAULT_APP);
}

export async function getExpenseDefaults(): Promise<ExpenseDefaults> {
  const stored = await getSetting<Partial<ExpenseDefaults>>("expenses.defaults", {});
  // Mezcla con los valores por defecto: si mañana se añade un campo nuevo,
  // los ajustes ya guardados no se quedan sin él.
  return { ...DEFAULT_EXPENSES, ...stored };
}

export type NotificationDefaults = {
  /** Interruptor general: si está apagado, el cron no manda ningún push. */
  enabled: boolean;

  /** Tareas: avisar de las tareas (recordatorio y fecha límite). */
  tasksEnabled: boolean;
  /** Avisos (varios) antes de la hora de recordatorio (`remindAt`). */
  taskRemindOffsets: number[];
  /** Avisos (varios) antes de la fecha límite (`dueAt`). Vacío = no avisar por fecha límite. */
  taskDueOffsets: number[];
  /** Solo avisar de tareas con estas prioridades. */
  taskPriorities: PriorityValue[];

  /** Leads: avisar de los seguimientos (`nextActionAt`). */
  leadsEnabled: boolean;
  leadFollowUpOffsets: number[];

  /** Resumen diario: tareas vencidas, tareas de hoy y seguimientos. */
  summaryEnabled: boolean;
  /** Hora local (0-23) a la que llega el resumen. */
  summaryHour: number;
  summaryIncludeOverdue: boolean;
  summaryIncludeToday: boolean;
  summaryIncludeLeads: boolean;

  /** Modo silencio: no se manda nada entre estas horas (se envía al terminar). */
  quietEnabled: boolean;
  quietStartHour: number;
  quietEndHour: number;
  /** Las tareas urgentes ignoran el modo silencio. */
  quietAllowUrgent: boolean;
};

export const DEFAULT_NOTIFICATIONS: NotificationDefaults = {
  enabled: true,
  tasksEnabled: true,
  taskRemindOffsets: [0],
  taskDueOffsets: [],
  taskPriorities: [...NOTIFICATION_PRIORITIES],
  leadsEnabled: true,
  leadFollowUpOffsets: [0],
  summaryEnabled: false,
  summaryHour: 9,
  summaryIncludeOverdue: true,
  summaryIncludeToday: true,
  summaryIncludeLeads: true,
  quietEnabled: false,
  quietStartHour: 22,
  quietEndHour: 8,
  quietAllowUrgent: true,
};

export async function getNotificationDefaults(): Promise<NotificationDefaults> {
  const stored = await getSetting<
    Partial<NotificationDefaults> & { reminderLeadMinutes?: number }
  >("notifications.defaults", {});
  const merged = { ...DEFAULT_NOTIFICATIONS, ...stored };
  // Compatibilidad: antes había una única antelación para todo.
  if (stored.reminderLeadMinutes !== undefined && stored.taskRemindOffsets === undefined) {
    merged.taskRemindOffsets = [stored.reminderLeadMinutes];
    merged.leadFollowUpOffsets = [stored.reminderLeadMinutes];
  }
  return merged;
}
