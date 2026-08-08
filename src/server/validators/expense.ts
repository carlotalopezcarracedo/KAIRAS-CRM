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

const optionalInt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : Number(v)))
  .optional()
  .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), {
    message: "Debe ser un número entero mayor que cero",
  });

const requiredDate = z
  .string()
  .trim()
  .min(1, "Obligatorio")
  .transform((v) => parseMadridLocal(v))
  .refine((v) => !Number.isNaN(v.getTime()), { message: "Fecha no válida" });

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

export const EXPENSE_KINDS = ["mileage", "fuel", "toll", "per_diem", "other"] as const;

export const expenseSchema = z
  .object({
    kind: z.enum(EXPENSE_KINDS).default("other"),
    description: z.string().trim().min(2, "La descripción es obligatoria"),
    expenseAt: requiredDate,

    // Desplazamiento
    originPlace: optionalText,
    destinationPlace: optionalText,
    kilometers: optionalNumber,
    ratePerKm: optionalNumber,
    roundTrip: checkbox,

    // Dietas
    perDiemDays: optionalInt,
    overnight: checkbox,

    // Importes manuales (gasolina, peaje suelto, otros)
    amountNet: optionalNumber,
    vatAmount: optionalNumber,

    supplier: optionalText,
    receiptUrl: optionalText,
    notes: optionalText,
    billable: checkbox,

    clientId: optionalText,
    projectId: optionalText,
  })
  // Cada tipo exige lo suyo: el importe de km y dietas se calcula, el resto
  // se teclea. Validarlo aquí evita guardar gastos de importe cero.
  .refine((v) => v.kind !== "mileage" || (v.kilometers !== undefined && v.kilometers > 0), {
    message: "Indica los kilómetros",
    path: ["kilometers"],
  })
  .refine((v) => v.kind !== "mileage" || !!v.originPlace, {
    message: "Indica el origen",
    path: ["originPlace"],
  })
  .refine((v) => v.kind !== "mileage" || !!v.destinationPlace, {
    message: "Indica el destino",
    path: ["destinationPlace"],
  })
  .refine((v) => v.kind !== "per_diem" || v.perDiemDays !== undefined, {
    message: "Indica cuántos días",
    path: ["perDiemDays"],
  })
  .refine(
    (v) =>
      !["fuel", "toll", "other"].includes(v.kind) ||
      (v.amountNet !== undefined && v.amountNet > 0),
    { message: "Indica el importe", path: ["amountNet"] },
  );

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const expenseDefaultsSchema = z.object({
  ratePerKm: optionalNumber.transform((v) => v ?? 0.26),
  perDiemDay: optionalNumber.transform((v) => v ?? 26.67),
  perDiemOvernight: optionalNumber.transform((v) => v ?? 53.34),
  tollSuppliers: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export type ExpenseDefaultsInput = z.infer<typeof expenseDefaultsSchema>;
