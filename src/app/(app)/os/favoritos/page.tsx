import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_TYPE_LABEL } from "../_config";
import { entryHref } from "../_sections";
import { listFavorites } from "@/server/services/os/knowledge-service";
import { requireUser } from "@/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Favoritos · KAIRAS OS" };

export default async function OsFavoritesPage() {
  const user = await requireUser();
  const entries = await listFavorites(user.id);

  return (
    <div>
      <Breadcrumbs items={[{ label: "KAIRAS OS", href: "/os" }, { label: "Favoritos" }]} />
      <PageHeader title="Favoritos" subtitle={`${entries.length} guardado${entries.length === 1 ? "" : "s"}`} />

      {entries.length === 0 ? (
        <EmptyState
          title="Todavía no tienes favoritos"
          hint="Marca cualquier entrada con la estrella para tenerla a mano aquí."
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={entryHref(e.id)}
                className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raise/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold text-foam">{e.title}</p>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-faint">
                  <Badge tone="neutral">{OS_TYPE_LABEL[e.type]}</Badge>
                  <span className="ml-auto">Actualizado {formatDate(e.updatedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
