import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EntryDetail } from "../../_components/entry-detail";
import { getArea } from "../../_config";
import { getEntry, isFavorite } from "@/server/services/os/knowledge-service";
import { requireUser } from "@/server/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntry(id);
  return { title: entry ? `${entry.title} · KAIRAS OS` : "KAIRAS OS" };
}

export default async function OsEntryPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  const cfg = getArea(area);
  if (!cfg) notFound();

  const user = await requireUser();
  const [entry, fav] = await Promise.all([getEntry(id), isFavorite(id, user.id)]);
  if (!entry) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "KAIRAS OS", href: "/os" },
          { label: cfg.label, href: `/os/${cfg.slug}` },
          { label: entry.title },
        ]}
      />
      <EntryDetail entry={entry} isFavorite={fav} />
    </div>
  );
}
