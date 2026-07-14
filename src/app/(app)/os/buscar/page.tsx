import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_TYPE_LABEL } from "../_config";
import { searchEntries } from "@/server/services/os/knowledge-service";

export const metadata: Metadata = { title: "Buscar · KAIRAS OS" };

export default async function OsSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : "";
  const results = q ? await searchEntries(q) : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "KAIRAS OS", href: "/os" }, { label: "Buscar" }]} />
      <PageHeader title="Buscar en KAIRAS OS" />

      <form action="/os/buscar" className="mb-6">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Busca por título, resumen o contenido…"
            className="h-11 w-full rounded-xl border border-line bg-ink pl-10 pr-3 text-sm text-foam placeholder:text-faint focus:border-violet-line transition-colors"
          />
        </div>
      </form>

      {!q ? (
        <EmptyState title="Escribe algo para buscar" hint="Busca conocimiento en toda la empresa: identidad, oferta, mensajes, casos, hipótesis, playbooks…" />
      ) : results.length === 0 ? (
        <EmptyState title={`Sin resultados para "${q}"`} hint="Prueba con otras palabras." />
      ) : (
        <div>
          <p className="k-label mb-3">{results.length} resultado{results.length === 1 ? "" : "s"}</p>
          <ul className="space-y-2">
            {results.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/os/${e.area}/${e.id}`}
                  className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raise/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foam">{e.title}</p>
                      {e.summary ? <p className="mt-1 line-clamp-2 text-sm text-mist">{e.summary}</p> : null}
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-faint">
                    <Badge tone="neutral">{OS_TYPE_LABEL[e.type]}</Badge>
                    {e.source ? <span>· {e.source.label}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
