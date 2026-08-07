import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toDateOnlyInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS } from "@/lib/labels";
import {
  getProposal,
  getProposalFormOptions,
} from "@/server/services/proposal-service";
import { ProposalForm, type ProposalFormDefaults } from "../../proposal-form";
import { updateProposalAction, deleteProposalAction } from "../../actions";
import { NewVersionButton } from "../../new-version-button";

export const metadata: Metadata = { title: "Editar propuesta" };

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [proposal, options] = await Promise.all([
    getProposal(id),
    getProposalFormOptions(),
  ]);
  if (!proposal) notFound();

  const defaults: ProposalFormDefaults = {
    title: proposal.title,
    status: proposal.status,
    leadId: proposal.leadId ?? "",
    clientId: proposal.clientId ?? "",
    opportunityId: proposal.opportunityId ?? "",
    amountNet: proposal.amountNet?.toString() ?? "",
    vatRate: proposal.vatRate.toString(),
    sentAt: toDateOnlyInput(proposal.sentAt),
    validUntil: toDateOnlyInput(proposal.validUntil),
    documentUrl: proposal.documentUrl ?? "",
    conditions: proposal.conditions ?? "",
    rejectedReason: proposal.rejectedReason ?? "",
    notes: proposal.notes ?? "",
  };

  return (
    <div>
      <PageHeader
        title={proposal.title}
        subtitle={`Versión ${proposal.version} · ${proposal.client?.name ?? proposal.lead?.name ?? "sin destinataria"}`}
        actions={
          <>
            <NewVersionButton id={proposal.id} />
            <ConfirmDelete
              action={deleteProposalAction.bind(null, proposal.id)}
              title="Eliminar propuesta"
              description="La propuesta se archivará (borrado suave). Podrás recuperarla en base de datos."
            />
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={PROPOSAL_STATUS[proposal.status].tone}>
          {PROPOSAL_STATUS[proposal.status].label}
        </Badge>
        {proposal.projects.length > 0 ? (
          <span className="text-xs text-faint">
            Proyectos creados: {proposal.projects.map((p) => p.name).join(", ")}
          </span>
        ) : null}
      </div>

      <ProposalForm
        action={updateProposalAction.bind(null, proposal.id)}
        defaults={defaults}
        leads={options.leads}
        clients={options.clients}
        opportunities={options.opportunities.map((o) => ({
          id: o.id,
          name: o.title,
        }))}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
