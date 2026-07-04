import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { OpportunityForm } from "../opportunity-form";
import { createOpportunityAction } from "../actions";

export const metadata: Metadata = { title: "Nueva oportunidad" };

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const leadId = typeof raw.leadId === "string" ? raw.leadId : "";

  const [leads, clients, services, lead] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null, status: { notIn: ["do_not_contact"] } },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    leadId
      ? prisma.lead.findFirst({
          where: { id: leadId, deletedAt: null },
          select: { name: true, serviceId: true, estimatedBudget: true },
        })
      : null,
  ]);

  return (
    <div>
      <PageHeader
        title="Nueva oportunidad"
        subtitle={lead ? `Desde el lead: ${lead.name}` : undefined}
      />
      <OpportunityForm
        action={createOpportunityAction}
        leads={leads}
        clients={clients}
        services={services}
        defaults={{
          leadId,
          title: lead ? `Propuesta para ${lead.name}` : "",
          serviceId: lead?.serviceId ?? "",
          estimatedValue: lead?.estimatedBudget?.toString() ?? "",
        }}
        submitLabel="Crear oportunidad"
      />
    </div>
  );
}
