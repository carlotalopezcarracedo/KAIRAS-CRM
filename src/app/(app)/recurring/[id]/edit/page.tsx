import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { prisma } from "@/server/db/prisma";
import { RecurringForm, type RecurringFormDefaults } from "../../recurring-form";
import { updateRecurringAction, deleteRecurringAction } from "../../actions";

export const metadata: Metadata = { title: "Editar recurrente" };

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditRecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recurring, clients, services] = await Promise.all([
    prisma.recurringService.findFirst({ where: { id, deletedAt: null } }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!recurring) notFound();

  const defaults: RecurringFormDefaults = {
    clientId: recurring.clientId,
    serviceId: recurring.serviceId,
    title: recurring.title ?? "",
    amount: recurring.amount.toString(),
    periodicity: recurring.periodicity,
    status: recurring.status,
    startedAt: toDateInput(recurring.startedAt),
    endsAt: toDateInput(recurring.endsAt),
    billingDay: String(recurring.billingDay),
    nextInvoiceAt: toDateInput(recurring.nextInvoiceAt),
    paymentMethod: recurring.paymentMethod ?? "",
    estimatedMargin: recurring.estimatedMargin?.toString() ?? "",
    notes: recurring.notes ?? "",
  };

  return (
    <div>
      <PageHeader
        title="Editar recurrente"
        actions={
          <ConfirmDelete
            action={deleteRecurringAction.bind(null, recurring.id)}
            title="Eliminar recurrente"
            description="El servicio recurrente se archivará (borrado suave)."
          />
        }
      />
      <RecurringForm
        action={updateRecurringAction.bind(null, recurring.id)}
        defaults={defaults}
        clients={clients}
        services={services}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
