import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/os/breadcrumbs";
import { EntryForm } from "../_components/entry-form";
import { createEntryAction } from "../actions";
import { getArea } from "../_config";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Nueva entrada · KAIRAS OS" };

export default async function OsNewEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const raw = await searchParams;
  const areaParam = typeof raw.area === "string" ? raw.area : undefined;
  const area = areaParam && getArea(areaParam) ? areaParam : undefined;
  const cfg = area ? getArea(area) : undefined;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "KAIRAS OS", href: "/os" },
          ...(cfg ? [{ label: cfg.label, href: `/os/${cfg.slug}` }] : []),
          { label: "Nueva entrada" },
        ]}
      />
      <PageHeader
        title="Nueva entrada"
        subtitle="Crea una unidad de conocimiento con su estado, autoridad y trazabilidad."
      />
      <EntryForm
        action={createEntryAction}
        mode="create"
        submitLabel="Crear entrada"
        defaults={{
          area,
          type: cfg?.types[0],
        }}
      />
    </div>
  );
}
