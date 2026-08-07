import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { toDateOnlyInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS, OPPORTUNITY_STAGE } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { getCampaign } from "@/server/services/campaign-service";
import { CampaignForm, type CampaignFormDefaults } from "../../campaign-form";
import { updateCampaignAction, deleteCampaignAction } from "../../actions";

export const metadata: Metadata = { title: "Editar campaña" };

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const defaults: CampaignFormDefaults = {
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    objective: campaign.objective ?? "",
    startAt: toDateOnlyInput(campaign.startAt),
    endAt: toDateOnlyInput(campaign.endAt),
    budget: campaign.budget?.toString() ?? "",
    spent: campaign.spent?.toString() ?? "",
    manualCostPerLead: campaign.manualCostPerLead?.toString() ?? "",
    promotedService: campaign.promotedService ?? "",
    url: campaign.url ?? "",
    utmSource: campaign.utmSource ?? "",
    utmMedium: campaign.utmMedium ?? "",
    utmCampaign: campaign.utmCampaign ?? "",
    utmContent: campaign.utmContent ?? "",
    notes: campaign.notes ?? "",
  };

  return (
    <div>
      <PageHeader
        title={campaign.name}
        subtitle={`${campaign.leads.length} leads · ${campaign.opportunities.length} oportunidades`}
        actions={
          <ConfirmDelete
            action={deleteCampaignAction.bind(null, campaign.id)}
            title="Eliminar campaña"
            description="La campaña se archivará (borrado suave). Los leads y oportunidades que cuelgan de ella no se borran."
          />
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads generados</CardTitle>
          </CardHeader>
          <CardBody>
            {campaign.leads.length === 0 ? (
              <p className="text-sm text-faint">
                Ninguno todavía. Asigna esta campaña al crear o editar un lead.
              </p>
            ) : (
              <ul className="space-y-2">
                {campaign.leads.slice(0, 10).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/leads/${l.id}`}
                      className="text-sm text-foam hover:text-lavender"
                    >
                      {l.name}
                    </Link>
                    <Badge tone={LEAD_STATUS[l.status].tone}>
                      {LEAD_STATUS[l.status].label}
                    </Badge>
                  </li>
                ))}
                {campaign.leads.length > 10 ? (
                  <li className="text-xs text-faint">
                    y {campaign.leads.length - 10} más
                  </li>
                ) : null}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oportunidades</CardTitle>
          </CardHeader>
          <CardBody>
            {campaign.opportunities.length === 0 ? (
              <p className="text-sm text-faint">Ninguna todavía.</p>
            ) : (
              <ul className="space-y-2">
                {campaign.opportunities.slice(0, 10).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/pipeline/${o.id}`}
                      className="text-sm text-foam hover:text-lavender"
                    >
                      {o.title}
                    </Link>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-mist">
                        {formatMoney(
                          (o.acceptedValue ?? o.estimatedValue)?.toString(),
                        )}
                      </span>
                      <Badge tone={OPPORTUNITY_STAGE[o.stage].tone}>
                        {OPPORTUNITY_STAGE[o.stage].label}
                      </Badge>
                    </span>
                  </li>
                ))}
                {campaign.opportunities.length > 10 ? (
                  <li className="text-xs text-faint">
                    y {campaign.opportunities.length - 10} más
                  </li>
                ) : null}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <CampaignForm
        action={updateCampaignAction.bind(null, campaign.id)}
        defaults={defaults}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
