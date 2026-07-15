import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/os/os-badges";
import { OS_TYPE_LABEL } from "../_config";
import { formatDate } from "@/lib/utils";
import type { EntryListItem } from "@/server/services/os/knowledge-service";

export function EntryList({
  entries,
  areaSlug,
  emptyTitle,
  emptyHint,
  createHref,
}: {
  entries: EntryListItem[];
  areaSlug: string;
  emptyTitle: string;
  emptyHint?: string;
  createHref?: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        hint={emptyHint}
        action={
          createHref ? (
            <ButtonLink href={createHref} size="sm">
              <Plus className="h-3.5 w-3.5" /> Crear la primera entrada
            </ButtonLink>
          ) : undefined
        }
      />
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id}>
          <Link
            href={`/os/${areaSlug}/${e.id}`}
            className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raise/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foam">{e.title}</p>
                {e.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm text-mist">{e.summary}</p>
                ) : null}
              </div>
              <StatusBadge status={e.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-faint">
              <Badge tone="neutral">{OS_TYPE_LABEL[e.type]}</Badge>
              {e.sector ? <span>· {e.sector}</span> : null}
              {e.tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {e.tags.map((t) => (
                    <span key={t.tagId} className="text-lavender/80">#{t.tag.slug}</span>
                  ))}
                </span>
              ) : null}
              <span className="ml-auto">Actualizado {formatDate(e.updatedAt)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
