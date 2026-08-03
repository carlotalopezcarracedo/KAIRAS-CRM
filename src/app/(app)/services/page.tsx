import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { SERVICE_CATEGORY } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { listServices } from "@/server/services/catalog-service";

export const metadata: Metadata = { title: "Servicios" };

const unitLabel: Record<string, string> = {
  project: "proyecto",
  hour: "hora",
  month: "mes",
  piece: "pieza",
  other: "otro",
};

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <div>
      <PageHeader
        title="Servicios"
        subtitle={`${services.filter((s) => s.active).length} activos en catálogo`}
        actions={
          <ButtonLink href="/services/new">
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </ButtonLink>
        }
      />

      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <TH>Servicio</TH>
              <TH>Categoría</TH>
              <TH className="text-right">Precio base</TH>
              <TH className="text-right">IVA</TH>
              <TH>Unidad</TH>
              <TH className="text-right">Uso</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {services.map((s) => (
              <TR key={s.id} className={!s.active ? "opacity-50" : undefined}>
                <TD>
                  <span className="font-semibold text-foam">{s.name}</span>
                  {!s.active ? (
                    <span className="ml-2 text-xs text-faint">(inactivo)</span>
                  ) : null}
                  {s.canBeRecurring ? (
                    <span className="ml-2 text-xs text-lavender">recurrente</span>
                  ) : null}
                </TD>
                <TD>
                  <Badge tone={SERVICE_CATEGORY[s.category].tone}>
                    {SERVICE_CATEGORY[s.category].label}
                  </Badge>
                </TD>
                <TD className="text-right text-mist">
                  {s.basePrice
                    ? formatMoney(s.basePrice.toString())
                    : s.priceMin
                      ? `${formatMoney(s.priceMin.toString())}–${formatMoney(s.priceMax?.toString())}`
                      : "—"}
                </TD>
                <TD className="text-right text-mist">{Number(s.vatRate)}%</TD>
                <TD className="text-mist">{unitLabel[s.billingUnit]}</TD>
                <TD className="text-right text-faint">
                  {s._count.projectsMain + s._count.recurringServices + s._count.opportunities}
                </TD>
                <TD>
                  <Link
                    href={`/services/${s.id}/edit`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-lavender hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/services/${s.id}/edit`}
              className={`block rounded-card border border-line bg-surface p-4 hover:border-line-strong ${!s.active ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-foam">{s.name}</p>
                <Badge tone={SERVICE_CATEGORY[s.category].tone}>
                  {SERVICE_CATEGORY[s.category].label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-mist">
                {s.basePrice ? `${formatMoney(s.basePrice.toString())} · ` : ""}
                IVA {Number(s.vatRate)}% · por {unitLabel[s.billingUnit]}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
