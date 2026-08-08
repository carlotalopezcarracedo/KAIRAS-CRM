"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { setSetting } from "@/server/services/settings-service";
import { expenseDefaultsSchema } from "@/server/validators/expense";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

const text = z.string().trim().default("");

const companyProfileSchema = z.object({
  brandName: z.string().trim().min(1, "Obligatorio"),
  legalName: text,
  vatId: text,
  email: text,
  phone: text,
  // Domicilio fiscal desglosado: hace falta por partes para las facturas
  // y para rellenar modelos de Hacienda.
  address: text,
  postalCode: text,
  city: text,
  province: text,
  country: z.string().trim().default("España"),
  taxRegime: text,
  iaeCode: text,
  socialSecurityNumber: text,
  iban: text,
  web: text,
  instagram: text,
});

const appDefaultsSchema = z.object({
  currency: z.string().trim().min(3).max(3).default("EUR"),
  timezone: z.string().trim().min(1).default("Europe/Madrid"),
  vatRate: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => !Number.isNaN(v) && v >= 0 && v <= 100, {
      message: "Entre 0 y 100",
    }),
  timeRounding: z
    .string()
    .trim()
    .transform((v) => Number(v))
    .refine((v) => [0, 5, 10, 15, 30].includes(v), {
      message: "0, 5, 10, 15 o 30 minutos",
    }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual"),
    newPassword: z.string().min(10, "Mínimo 10 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

const rateSchema = z
  .object({
    scope: z.enum(["global", "client", "project", "service"]),
    rate: z
      .string()
      .trim()
      .min(1, "Obligatorio")
      .transform((v) => Number(v))
      .refine((v) => !Number.isNaN(v) && v > 0, { message: "Debe ser mayor que 0" }),
    clientId: text,
    projectId: text,
    serviceId: text,
    validFrom: text,
    notes: text,
  })
  .refine(
    (data) =>
      data.scope === "global" ||
      (data.scope === "client" && data.clientId) ||
      (data.scope === "project" && data.projectId) ||
      (data.scope === "service" && data.serviceId),
    { message: "Selecciona a qué aplica la tarifa", path: ["scope"] },
  );

async function withUser(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, error: "Sesión caducada. Vuelve a entrar." };
  }
}

export async function saveCompanyProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = companyProfileSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  await setSetting("company.profile", parsed.data);
  await audit({
    actorId: auth.userId,
    action: "update",
    entityType: "Settings",
    metadata: { key: "company.profile" },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveAppDefaultsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = appDefaultsSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  await setSetting("app.defaults", parsed.data);
  await audit({
    actorId: auth.userId,
    action: "update",
    entityType: "Settings",
    metadata: { key: "app.defaults" },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveExpenseDefaultsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = expenseDefaultsSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  await setSetting("expenses.defaults", parsed.data);
  await audit({
    actorId: auth.userId,
    action: "update",
    entityType: "Settings",
    metadata: { key: "expenses.defaults" },
  });
  revalidatePath("/settings");
  revalidatePath("/expenses");
  return { ok: true };
}

export async function changePasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = passwordSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return { ok: false, error: "Usuaria no encontrada." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return {
      ok: false,
      error: "La contraseña actual no es correcta.",
      fieldErrors: { currentPassword: ["Contraseña incorrecta"] },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await audit({
    actorId: user.id,
    action: "update",
    entityType: "User",
    entityId: user.id,
    metadata: { passwordChanged: true },
  });
  return { ok: true };
}

export async function createRateAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = rateSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  await prisma.hourlyRate.create({
    data: {
      scope: data.scope,
      rate: data.rate,
      clientId: data.scope === "client" ? data.clientId : null,
      projectId: data.scope === "project" ? data.projectId : null,
      serviceId: data.scope === "service" ? data.serviceId : null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      notes: data.notes || null,
    },
  });
  await audit({
    actorId: auth.userId,
    action: "create",
    entityType: "HourlyRate",
    metadata: { scope: data.scope, rate: data.rate },
  });
  revalidatePath("/settings/rates");
  return { ok: true };
}

export async function toggleRateAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const rate = await prisma.hourlyRate.findUnique({ where: { id } });
  if (!rate) return { ok: false, error: "Tarifa no encontrada." };

  await prisma.hourlyRate.update({
    where: { id },
    data: { active: !rate.active },
  });
  await audit({
    actorId: auth.userId,
    action: "update",
    entityType: "HourlyRate",
    entityId: id,
    metadata: { active: !rate.active },
  });
  revalidatePath("/settings/rates");
  return { ok: true };
}
