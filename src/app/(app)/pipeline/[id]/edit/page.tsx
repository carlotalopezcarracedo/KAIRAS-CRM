import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { OpportunityForm, type OpportunityFormDefaults } from "../../opportunity-form";
import { updateOpportunityAction } from "../../actions";

export const metadata: Metadata = { title: "Editar oportunidad" };

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opp, leads, clients, services] = await Promise.all([
    prisma.opportunity.findFirst({ where: { id, deletedAt: null } }),
    prisma.lead.findMany({
      where: { deletedAt: null },
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
  ]);
  if (!opp) notFound();

  const defaults: OpportunityFormDefaults = {
    title: opp.title,
    leadId: opp.leadId ?? "",
    clientId: opp.clientId ?? "",
    serviceId: opp.serviceId ?? "",
    stage: opp.stage,
    estimatedValue: opp.estimatedValue?.toString() ?? "",
    probability: String(opp.probability),
    expectedCloseAt: toDateInput(opp.expectedCloseAt),
    priority: opp.priority,
    urgencyLevel: opp.urgencyLevel?.toString() ?? "",
    kairasFit: opp.kairasFit?.toString() ?? "",
    costOfInaction: opp.costOfInaction ?? "",
    nextAction: opp.nextAction ?? "",
    nextActionAt: toLocalInput(opp.nextActionAt),
    observations: opp.observations ?? "",
  };

  return (
    <div>
      <PageHeader title={`Editar: ${opp.title}`} />
      <OpportunityForm
        action={updateOpportunityAction.bind(null, opp.id)}
        defaults={defaults}
        leads={leads}
        clients={clients}
        services={services}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
