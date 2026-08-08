import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

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
  address: string;
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
  web: "",
  instagram: "",
};

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

export function getCompanyProfile() {
  return getSetting<CompanyProfile>("company.profile", DEFAULT_COMPANY);
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
