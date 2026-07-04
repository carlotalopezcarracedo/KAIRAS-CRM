import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { LeadForm } from "../lead-form";
import { createLeadAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo lead" };

export default async function NewLeadPage() {
  const services = await prisma.service.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader
        title="Nuevo lead"
        subtitle="Solo el nombre es obligatorio. El resto se puede completar después."
      />
      <LeadForm
        action={createLeadAction}
        services={services}
        submitLabel="Crear lead"
      />
    </div>
  );
}
