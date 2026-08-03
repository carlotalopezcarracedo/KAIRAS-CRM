import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHero } from "../_components/os-ui";
import {
  MarcaView, IdentityView, StrategyOverviewView, MarketingView, ComercialView, PlaybooksView,
  LearningView, ContentView, RecursosView, ConstitucionView, GenericView,
} from "../_components/section-views";
import { canonicalSectionSlug, getSection } from "../_sections";
import { getSectionEntries, type SectionEntry } from "@/server/services/os/os-views-service";
import { requireUser } from "@/server/auth";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const cfg = getSection(section);
  return { title: cfg ? `${cfg.label} · KAIRAS OS` : "KAIRAS OS" };
}

function render(slug: string, entries: SectionEntry[]) {
  switch (slug) {
    case "estrategia": return <StrategyOverviewView entries={entries} />;
    case "marca": return <IdentityView entries={entries} />;
    case "visual": return <MarcaView entries={entries} />;
    case "comunicacion": return <MarketingView entries={entries} />;
    case "oferta": return <ComercialView entries={entries} />;
    case "playbooks": return <PlaybooksView entries={entries} />;
    case "aprendizaje": return <LearningView entries={entries} />;
    case "contenidos": return <ContentView entries={entries} />;
    case "recursos": return <RecursosView entries={entries} />;
    case "constitucion": return <ConstitucionView entries={entries} />;
    default: return <GenericView entries={entries} />;
  }
}

export default async function OsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const canonical = canonicalSectionSlug(section);
  if (canonical && canonical !== section) redirect(`/os/${canonical}`);
  const cfg = getSection(section);
  if (!cfg) notFound();

  return (
    <div>
      <SectionHero
        section={cfg}
        actions={
          <ButtonLink href="/os/nuevo" prefetch={false} variant="secondary" size="sm">
            <Plus className="h-3.5 w-3.5" /> Nueva
          </ButtonLink>
        }
      />
      <Suspense fallback={<SectionEntriesFallback />}>
        <SectionEntries section={section} config={cfg} />
      </Suspense>
    </div>
  );
}

async function SectionEntries({
  section,
  config,
}: {
  section: string;
  config: NonNullable<ReturnType<typeof getSection>>;
}) {
  const userPromise = requireUser();
  const entriesPromise = getSectionEntries(
    { areas: config.areas, types: config.types },
    {
      includeHistoric:
        section === "marca" || section === "visual" || section === "constitucion",
    },
  );
  const [, entries] = await Promise.all([userPromise, entriesPromise]);
  return render(config.slug, entries);
}

function SectionEntriesFallback() {
  return (
    <div role="status" aria-label="Cargando contenido de la seccion" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-2xl border border-line bg-surface"
        />
      ))}
      <span className="sr-only">Preparando contenido operativo...</span>
    </div>
  );
}
