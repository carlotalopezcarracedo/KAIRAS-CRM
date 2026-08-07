import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getProposalFormOptions } from "@/server/services/proposal-service";
import { ProposalForm, type ProposalFormDefaults } from "../proposal-form";
import { createProposalAction } from "../actions";

export const metadata: Metadata = { title: "Nueva propuesta" };

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [raw, options] = await Promise.all([
    searchParams,
    getProposalFormOptions(),
  ]);

  // Permite llegar desde una oportunidad o una ficha con el vínculo ya puesto.
  const defaults: ProposalFormDefaults = {
    opportunityId: typeof raw.opportunityId === "string" ? raw.opportunityId : "",
    clientId: typeof raw.clientId === "string" ? raw.clientId : "",
    leadId: typeof raw.leadId === "string" ? raw.leadId : "",
  };

  return (
    <div>
      <PageHeader
        title="Nueva propuesta"
        subtitle="El total con IVA se calcula solo a partir del neto"
      />
      <ProposalForm
        action={createProposalAction}
        defaults={defaults}
        leads={options.leads}
        clients={options.clients}
        opportunities={options.opportunities.map((o) => ({
          id: o.id,
          name: o.title,
        }))}
        submitLabel="Crear propuesta"
      />
    </div>
  );
}
