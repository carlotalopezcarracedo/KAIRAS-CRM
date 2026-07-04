import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { ServiceForm, type ServiceFormDefaults } from "../../service-form";
import { updateServiceAction } from "../../actions";

export const metadata: Metadata = { title: "Editar servicio" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await prisma.service.findFirst({ where: { id, deletedAt: null } });
  if (!service) notFound();

  const defaults: ServiceFormDefaults = {
    name: service.name,
    category: service.category,
    description: service.description ?? "",
    basePrice: service.basePrice?.toString() ?? "",
    priceMin: service.priceMin?.toString() ?? "",
    priceMax: service.priceMax?.toString() ?? "",
    vatRate: service.vatRate.toString(),
    billingUnit: service.billingUnit,
    canBeRecurring: service.canBeRecurring,
    deliverables: service.deliverables ?? "",
    odooProductRef: service.odooProductRef ?? "",
    active: service.active,
  };

  return (
    <div>
      <PageHeader title={`Editar: ${service.name}`} />
      <ServiceForm
        action={updateServiceAction.bind(null, service.id)}
        defaults={defaults}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
