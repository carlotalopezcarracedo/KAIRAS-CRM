import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { FilterChips } from "@/components/os/filter-chips";
import { EntryList } from "../_components/entry-list";
import { getArea, OS_STATUS, OS_TYPE_LABEL } from "../_config";
import { listEntries } from "@/server/services/os/knowledge-service";
import { listFiltersSchema } from "@/server/validators/os/knowledge";
import type { OsEntryType, OsStatus } from "@/types/os";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const cfg = getArea(area);
  return { title: cfg ? `${cfg.label} · KAIRAS OS` : "KAIRAS OS" };
}

export default async function OsAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { area } = await params;
  const cfg = getArea(area);
  if (!cfg) notFound();

  const raw = await searchParams;
  const f = listFiltersSchema.parse({
    status: typeof raw.status === "string" ? raw.status : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    tag: typeof raw.tag === "string" ? raw.tag : undefined,
    q: typeof raw.q === "string" ? raw.q : undefined,
  });

  const entries = await listEntries({
    area: cfg.slug,
    types: f.type ? undefined : cfg.types,
    type: (f.type as OsEntryType) || undefined,
    status: (f.status as OsStatus) || undefined,
    tag: f.tag || undefined,
    q: f.q || undefined,
  });

  const base = `/os/${cfg.slug}`;
  const statusChips = Object.entries(OS_STATUS).map(([value, s]) => ({ label: s.label, value }));
  const typeChips = cfg.types.map((t) => ({ label: OS_TYPE_LABEL[t], value: t }));

  return (
    <div>
      <Breadcrumbs items={[{ label: "KAIRAS OS", href: "/os" }, { label: cfg.label }]} />
      <PageHeader
        title={cfg.label}
        subtitle={`${entries.length} ${entries.length === 1 ? "entrada" : "entradas"} · ${cfg.description}`}
      />

      {typeChips.length > 1 ? (
        <FilterChips chips={typeChips} param="type" active={f.type} basePath={base} allLabel="Todos los tipos" />
      ) : null}
      <FilterChips chips={statusChips} param="status" active={f.status} basePath={base} allLabel="Todos los estados" />

      <EntryList
        entries={entries}
        areaSlug={cfg.slug}
        emptyTitle={
          f.status || f.type || f.q ? "Ninguna entrada con estos filtros" : "Todavía no hay entradas en esta área"
        }
        emptyHint={
          f.status || f.type || f.q
            ? "Prueba a quitar filtros."
            : "Se cargarán con la importación inicial del conocimiento."
        }
      />
    </div>
  );
}
