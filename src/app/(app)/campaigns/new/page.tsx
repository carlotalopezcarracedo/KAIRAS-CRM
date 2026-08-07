import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "../campaign-form";
import { createCampaignAction } from "../actions";

export const metadata: Metadata = { title: "Nueva campaña" };

export default function NewCampaignPage() {
  return (
    <div>
      <PageHeader
        title="Nueva campaña"
        subtitle="Asigna los leads a la campaña para que el coste por lead salga solo"
      />
      <CampaignForm action={createCampaignAction} submitLabel="Crear campaña" />
    </div>
  );
}
