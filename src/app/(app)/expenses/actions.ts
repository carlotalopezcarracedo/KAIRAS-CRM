"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { expenseSchema } from "@/server/validators/expense";
import {
  createExpense,
  updateExpense,
  assignExpense,
  softDeleteExpense,
} from "@/server/services/expense-service";
import {
  importTollExpenses,
  describeOdooError,
} from "@/server/services/toll-import-service";
import type { ActionResult } from "@/lib/action-result";

function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

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

export async function createExpenseAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = expenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createExpense(auth.userId, parsed.data);
  } catch (err) {
    console.error("[createExpenseAction]", err);
    return { ok: false, error: "No se pudo registrar el gasto." };
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function updateExpenseAction(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = expenseSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateExpense(auth.userId, id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este gasto ya no existe." };
    }
    if (err instanceof Error && err.message === "IMPORTED") {
      return {
        ok: false,
        error:
          "Este peaje viene de Odoo: sus importes no se editan aquí. Puedes asignarlo a un proyecto desde el listado.",
      };
    }
    console.error("[updateExpenseAction]", err);
    return { ok: false, error: "No se pudo guardar." };
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

const assignSchema = z.object({
  clientId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
});

export async function assignExpenseAction(
  id: string,
  values: { clientId?: string; projectId?: string },
): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  const parsed = assignSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };

  try {
    await assignExpense(auth.userId, id, {
      clientId: parsed.data.clientId || null,
      projectId: parsed.data.projectId || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este gasto ya no existe." };
    }
    console.error("[assignExpenseAction]", err);
    return { ok: false, error: "No se pudo asignar." };
  }

  revalidatePath("/expenses");
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const auth = await withUser();
  if (!auth.ok) return auth;

  try {
    await softDeleteExpense(auth.userId, id);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { ok: false, error: "Este gasto ya no existe." };
    }
    console.error("[deleteExpenseAction]", err);
    return { ok: false, error: "No se pudo eliminar." };
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export type TollImportActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function importTollsAction(): Promise<TollImportActionResult> {
  const auth = await withUser();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const result = await importTollExpenses(auth.userId);
    revalidatePath("/expenses");

    if (result.matched === 0) {
      return {
        ok: true,
        message: `Sin peajes nuevos: se han revisado ${result.scanned} facturas de proveedor y ninguna coincide con los proveedores configurados.`,
      };
    }
    return {
      ok: true,
      message:
        `${result.imported} peajes importados` +
        (result.skipped > 0 ? `, ${result.skipped} ya estaban` : "") +
        (result.truncated ? ". Hay más facturas: vuelve a importar." : "."),
    };
  } catch (err) {
    console.error("[importTollsAction]", err);
    return { ok: false, error: describeOdooError(err) };
  }
}
