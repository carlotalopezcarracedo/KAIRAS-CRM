import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_STATUS, OS_TYPE_LABEL } from "../_config";
import { OS_SECTIONS, entryHref, getSection, sectionForEntry } from "../_sections";
import {
  searchKnowledge,
  type BaseEntry,
  type KnowledgeSearchFilters,
} from "@/server/services/os/os-views-service";
import type { OsEntryType, OsStatus } from "@/types/os";

export const metadata: Metadata = { title: "Buscar · KAIRAS OS" };

const fieldClass =
  "h-10 rounded-xl border border-line bg-ink px-3 text-sm text-foam outline-none transition-colors focus:border-violet-line";

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function validKey<T extends string>(value: string, record: Record<T, unknown>): value is T {
  return Object.hasOwn(record, value);
}

function Highlight({ children, query }: { children: string; query: string }) {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (tokens.length === 0) return children;
  const pattern = new RegExp(`(${tokens.join("|")})`, "gi");
  return children.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`} className="rounded bg-warn-soft px-0.5 text-foam">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function groupResults(results: BaseEntry[]) {
  const groups = new Map<string, { label: string; entries: BaseEntry[] }>();
  for (const entry of results) {
    const section = sectionForEntry(entry.area, entry.type);
    const key = section?.slug ?? entry.area;
    const current = groups.get(key) ?? { label: section?.label ?? entry.area, entries: [] };
    current.entries.push(entry);
    groups.set(key, current);
  }
  return [...groups.entries()];
}

export default async function OsSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = one(raw.q);
  const rawType = one(raw.type);
  const rawStatus = one(raw.status);
  const sectionSlug = one(raw.section);
  const section = getSection(sectionSlug);
  const type = validKey(rawType, OS_TYPE_LABEL) ? (rawType as OsEntryType) : undefined;
  const status = validKey(rawStatus, OS_STATUS) ? (rawStatus as OsStatus) : undefined;
  const filters: KnowledgeSearchFilters = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(section?.areas?.length ? { areas: section.areas } : {}),
  };
  const results = q ? await searchKnowledge(q, filters) : [];
  const groups = groupResults(results);
  const hasFilters = Boolean(type || status || section);

  return (
    <div>
      <Breadcrumbs items={[{ label: "KAIRAS OS", href: "/os" }, { label: "Buscar" }]} />
      <PageHeader
        title="Buscar en KAIRAS OS"
        subtitle="Consulta títulos, resúmenes, contenido, etiquetas y contexto operativo."
      />

      <form action="/os/buscar" className="mb-8 rounded-2xl border border-line bg-surface p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Ej.: precios, clínica en frío, colores, Estersa…"
            className="h-12 w-full rounded-xl border border-line bg-ink pl-10 pr-3 text-sm text-foam outline-none transition-colors placeholder:text-faint focus:border-violet-line"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-faint">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filtrar
          </span>
          <select name="section" defaultValue={section?.slug ?? ""} aria-label="Sección" className={fieldClass}>
            <option value="">Todas las secciones</option>
            {OS_SECTIONS.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
          </select>
          <select name="type" defaultValue={type ?? ""} aria-label="Tipo" className={fieldClass}>
            <option value="">Todos los tipos</option>
            {Object.entries(OS_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ""} aria-label="Estado" className={fieldClass}>
            <option value="">Todos los estados</option>
            {Object.entries(OS_STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
          </select>
          <button type="submit" className="h-10 rounded-xl bg-violet px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Buscar
          </button>
          {hasFilters ? (
            <Link href={`/os/buscar?q=${encodeURIComponent(q)}`} className="inline-flex h-10 items-center gap-1.5 px-2 text-xs text-mist hover:text-foam">
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </Link>
          ) : null}
        </div>
      </form>

      {!q ? (
        <EmptyState title="Escribe algo para buscar" hint="Puedes buscar decisiones, mensajes, clientes, recursos, hipótesis o pasos de un playbook." />
      ) : results.length === 0 ? (
        <EmptyState title={`Sin resultados para “${q}”`} hint={hasFilters ? "Prueba a limpiar algún filtro o usa otra palabra." : "Prueba con una palabra más corta o una idea relacionada."} />
      ) : (
        <div>
          <p className="k-label mb-4">{results.length} resultado{results.length === 1 ? "" : "s"} en {groups.length} {groups.length === 1 ? "sección" : "secciones"}</p>
          <div className="space-y-8">
            {groups.map(([key, group]) => (
              <section key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">{group.label}</h2>
                  <span className="rounded-full bg-raise px-2 py-0.5 text-[10px] text-mist">{group.entries.length}</span>
                </div>
                <ul className="space-y-2">
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <Link
                        href={entryHref(entry.id)}
                        prefetch={false}
                        className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raise/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foam"><Highlight query={q}>{entry.title}</Highlight></p>
                            {entry.summary ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-mist"><Highlight query={q}>{entry.summary}</Highlight></p> : null}
                          </div>
                          <StatusBadge status={entry.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-faint">
                          <Badge tone="neutral">{OS_TYPE_LABEL[entry.type]}</Badge>
                          {entry.sector ? <span>· {entry.sector}</span> : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
