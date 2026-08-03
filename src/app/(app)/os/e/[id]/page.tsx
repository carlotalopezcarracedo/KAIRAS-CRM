import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EntryDetail } from "../../_components/entry-detail";
import { ViewRecorder } from "../../_components/view-recorder";
import { sectionForEntry } from "../../_sections";
import { getEntry, isFavorite, getUserNames } from "@/server/services/os/knowledge-service";
import { requireUser } from "@/server/auth";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const entry = await getEntry(id);
  return { title: entry ? `${entry.title} · KAIRAS OS` : "KAIRAS OS" };
}

export default async function OsEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userPromise = requireUser();
  const entryPromise = getEntry(id);
  const [user, entry] = await Promise.all([
    userPromise,
    entryPromise,
  ]);
  if (!entry) notFound();
  const [fav, authorNames] = await Promise.all([
    isFavorite(id, user.id),
    getUserNames(entry.versions.map((version) => version.authorId)),
  ]);
  const section = sectionForEntry(entry.area, entry.type);

  return (
    <div>
      <ViewRecorder entryId={entry.id} />
      <Breadcrumbs
        items={[
          { label: "KAIRAS OS", href: "/os" },
          ...(section ? [{ label: section.label, href: `/os/${section.slug}` }] : []),
          { label: entry.title },
        ]}
      />
      <EntryDetail entry={entry} isFavorite={fav} authorNames={authorNames} />
    </div>
  );
}
