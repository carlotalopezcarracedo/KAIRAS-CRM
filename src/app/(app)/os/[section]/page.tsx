import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHero } from "../_components/os-ui";
import {
  MarcaView, EstrategiaView, MarketingView, ComercialView, ClientesView,
  PlaybooksView, ProcesosView, RecursosView, ConstitucionView, GenericView,
} from "../_components/section-views";
import { getSection } from "../_sections";
import { getSectionEntries, type SectionEntry } from "@/server/services/os/os-views-service";
import { requireUser } from "@/server/auth";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const cfg = getSection(section);
  return { title: cfg ? `${cfg.label} · KAIRAS OS` : "KAIRAS OS" };
}

function render(slug: string, entries: SectionEntry[]) {
  switch (slug) {
    case "marca": return <MarcaView entries={entries} />;
    case "estrategia": return <EstrategiaView entries={entries} />;
    case "marketing": return <MarketingView entries={entries} />;
    case "comercial": return <ComercialView entries={entries} />;
    case "clientes": return <ClientesView entries={entries} />;
    case "playbooks": return <PlaybooksView entries={entries} />;
    case "procesos": return <ProcesosView entries={entries} />;
    case "recursos": return <RecursosView entries={entries} />;
    case "constitucion": return <ConstitucionView entries={entries} />;
    default: return <GenericView entries={entries} />;
  }
}

export default async function OsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireUser();
  const { section } = await params;
  const cfg = getSection(section);
  if (!cfg) notFound();

  const includeHistoric = section === "estrategia" || section === "marca" || section === "constitucion";
  const entries = await getSectionEntries(
    { areas: cfg.areas, types: cfg.types },
    { includeHistoric },
  );

  return (
    <div>
      <SectionHero
        section={cfg}
        count={entries.length}
        actions={
          <ButtonLink href="/os/nuevo" variant="secondary" size="sm">
            <Plus className="h-3.5 w-3.5" /> Nueva
          </ButtonLink>
        }
      />
      {render(cfg.slug, entries)}
    </div>
  );
}
