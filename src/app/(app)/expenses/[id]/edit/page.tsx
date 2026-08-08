import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { toDateOnlyInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import {
  getExpense,
  getExpenseFormOptions,
} from "@/server/services/expense-service";
import { ExpenseForm, type ExpenseFormDefaults } from "../../expense-form";
import { updateExpenseAction, deleteExpenseAction } from "../../actions";

export const metadata: Metadata = { title: "Editar gasto" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [expense, options] = await Promise.all([
    getExpense(id),
    getExpenseFormOptions(),
  ]);
  if (!expense) notFound();

  // Un peaje importado es el reflejo de una factura de Odoo: no se edita.
  if (expense.source === "odoo") redirect("/expenses");

  const formDefaults: ExpenseFormDefaults = {
    kind: expense.kind,
    description: expense.description,
    expenseAt: toDateOnlyInput(expense.expenseAt),
    originPlace: expense.originPlace ?? "",
    destinationPlace: expense.destinationPlace ?? "",
    kilometers: expense.kilometers?.toString() ?? "",
    ratePerKm: expense.ratePerKm?.toString() ?? String(options.defaults.ratePerKm),
    roundTrip: expense.roundTrip,
    perDiemDays: expense.perDiemDays?.toString() ?? "",
    overnight: expense.overnight,
    amountNet: expense.amountNet?.toString() ?? "",
    vatAmount: expense.vatAmount?.toString() ?? "",
    supplier: expense.supplier ?? "",
    receiptUrl: expense.receiptUrl ?? "",
    notes: expense.notes ?? "",
    billable: expense.billable,
    clientId: expense.clientId ?? "",
    projectId: expense.projectId ?? "",
  };

  return (
    <div>
      <PageHeader
        title="Editar gasto"
        subtitle={expense.description}
        actions={
          <ConfirmDelete
            action={deleteExpenseAction.bind(null, expense.id)}
            title="Eliminar gasto"
            description="El gasto se archivará (borrado suave)."
          />
        }
      />
      <ExpenseForm
        action={updateExpenseAction.bind(null, expense.id)}
        defaults={formDefaults}
        rates={{
          ratePerKm: options.defaults.ratePerKm,
          perDiemDay: options.defaults.perDiemDay,
          perDiemOvernight: options.defaults.perDiemOvernight,
        }}
        clients={options.clients}
        projects={options.projects}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
