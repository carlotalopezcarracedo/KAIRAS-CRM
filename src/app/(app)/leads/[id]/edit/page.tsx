import type { Metadata } from "next";
import { toDateTimeLocalInput } from "@/lib/dates";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/server/db/prisma";
import { LeadForm, type LeadFormDefaults } from "../../lead-form";
import { updateLeadAction } from "../../actions";

export const metadata: Metadata = { title: "Editar lead" };

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, services] = await Promise.all([
    prisma.lead.findFirst({ where: { id, deletedAt: null } }),
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!lead) notFound();

  const defaults: LeadFormDefaults = {
    name: lead.name,
    contact: lead.contact ?? "",
    role: lead.role ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    instagram: lead.instagram ?? "",
    website: lead.website ?? "",
    city: lead.city ?? "",
    province: lead.province ?? "",
    sector: lead.sector ?? "",
    status: lead.status,
    temperature: lead.temperature,
    source: lead.source,
    consentStatus: lead.consentStatus,
    painDetected: lead.painDetected ?? "",
    potentialService: lead.potentialService ?? "",
    serviceId: lead.serviceId ?? "",
    estimatedBudget: lead.estimatedBudget?.toString() ?? "",
    probability: lead.probability?.toString() ?? "",
    objections: lead.objections ?? "",
    internalNotes: lead.internalNotes ?? "",
    nextAction: lead.nextAction ?? "",
    nextActionAt: toDateTimeLocalInput(lead.nextActionAt),
    utmSource: lead.utmSource ?? "",
    utmMedium: lead.utmMedium ?? "",
    utmCampaign: lead.utmCampaign ?? "",
    utmContent: lead.utmContent ?? "",
  };

  const boundAction = updateLeadAction.bind(null, lead.id);

  return (
    <div>
      <PageHeader title={`Editar: ${lead.name}`} />
      <LeadForm
        action={boundAction}
        defaults={defaults}
        services={services}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
