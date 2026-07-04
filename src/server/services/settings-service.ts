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

export function getCompanyProfile() {
  return getSetting<CompanyProfile>("company.profile", DEFAULT_COMPANY);
}

export function getAppDefaults() {
  return getSetting<AppDefaults>("app.defaults", DEFAULT_APP);
}
