import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { ClientForm, type ClientFormDefaults } from "../../client-form";
import { updateClientAction } from "../../actions";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) notFound();

  const defaults: ClientFormDefaults = {
    name: client.name,
    status: client.status,
    vatId: client.vatId ?? "",
    billingEmail: client.billingEmail ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    province: client.province ?? "",
    odooPartnerId: client.odooPartnerId ?? "",
    satisfaction: client.satisfaction?.toString() ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div>
      <PageHeader title={`Editar: ${client.name}`} />
      <ClientForm
        action={updateClientAction.bind(null, client.id)}
        defaults={defaults}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
