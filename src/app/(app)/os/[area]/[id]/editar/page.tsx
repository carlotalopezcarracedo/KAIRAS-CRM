import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EntryForm } from "../../../_components/entry-form";
import { updateEntryAction } from "../../../actions";
import { getArea } from "../../../_config";
import { getEntry } from "@/server/services/os/knowledge-service";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Editar · KAIRAS OS" };

function toDateInput(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return new Date(d).toISOString().slice(0, 10);
}

export default async function OsEditEntryPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  await requireUser();
  const { area, id } = await params;
  const cfg = getArea(area);
  if (!cfg) notFound();
  const entry = await getEntry(id);
  if (!entry) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "KAIRAS OS", href: "/os" },
          { label: cfg.label, href: `/os/${cfg.slug}` },
          { label: entry.title, href: `/os/${cfg.slug}/${entry.id}` },
          { label: "Editar" },
        ]}
      />
      <PageHeader title="Editar entrada" subtitle={entry.title} />
      <EntryForm
        action={updateEntryAction}
        mode="edit"
        submitLabel="Guardar cambios"
        defaults={{
          id: entry.id,
          type: entry.type,
          area: entry.area,
          title: entry.title,
          summary: entry.summary ?? undefined,
          body: entry.body ?? undefined,
          status: entry.status,
          authority: entry.authority,
          businessLine: entry.businessLine,
          messageLayer: entry.messageLayer,
          sector: entry.sector ?? undefined,
          validUntil: toDateInput(entry.validUntil),
          tags: entry.tags.map((t) => t.tag.name).join(", "),
          meta: entry.meta ? JSON.stringify(entry.meta, null, 2) : undefined,
        }}
      />
    </div>
  );
}
