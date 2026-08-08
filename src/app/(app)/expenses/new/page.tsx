import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { toDateOnlyInput } from "@/lib/dates";
import { getExpenseFormOptions } from "@/server/services/expense-service";
import { ExpenseForm, type ExpenseFormDefaults } from "../expense-form";
import { createExpenseAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage() {
  const { clients, projects, defaults } = await getExpenseFormOptions();

  const formDefaults: ExpenseFormDefaults = {
    kind: "mileage",
    expenseAt: toDateOnlyInput(new Date()),
    ratePerKm: String(defaults.ratePerKm),
  };

  return (
    <div>
      <PageHeader
        title="Nuevo gasto"
        subtitle="Desplazamiento, gasolina o dieta. Los peajes se importan de Odoo."
      />
      <ExpenseForm
        action={createExpenseAction}
        defaults={formDefaults}
        rates={{
          ratePerKm: defaults.ratePerKm,
          perDiemDay: defaults.perDiemDay,
          perDiemOvernight: defaults.perDiemOvernight,
        }}
        clients={clients}
        projects={projects}
        submitLabel="Registrar gasto"
      />
    </div>
  );
}
