import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LEAD_STATUS, TEMPERATURE, LEAD_SOURCE } from "@/lib/labels";
import { formatDate, relativeDays } from "@/lib/utils";
import { listLeads } from "@/server/services/lead-service";
import { leadFiltersSchema } from "@/server/validators/lead";
import { LeadFilters } from "./lead-filters";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = leadFiltersSchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    status: typeof raw.status === "string" ? raw.status : undefined,
    temperature: typeof raw.temperature === "string" ? raw.temperature : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
  });

  const leads = await listLeads(filters);
  const hasFilters =
    !!filters.q || !!filters.status || !!filters.temperature || !!filters.source;

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} ${leads.length === 1 ? "lead" : "leads"}${hasFilters ? " con estos filtros" : ""}`}
        actions={
          <ButtonLink href="/leads/new">
            <Plus className="h-4 w-4" />
            Nuevo lead
          </ButtonLink>
        }
      />

      <LeadFilters />

      {leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Ningún lead con estos filtros" : "Todavía no hay leads"}
          hint={
            hasFilters
              ? "Prueba a quitar filtros o busca por otro término."
              : "Crea tu primer lead para empezar a trabajar el pipeline."
          }
          action={
            !hasFilters ? (
              <ButtonLink href="/leads/new" size="sm">
                <Plus className="h-4 w-4" />
                Crear lead
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Lead</TH>
                  <TH>Estado</TH>
                  <TH>Temperatura</TH>
                  <TH>Fuente</TH>
                  <TH>Siguiente acción</TH>
                  <TH>Último contacto</TH>
                </tr>
              </THead>
              <TBody>
                {leads.map((lead) => (
                  <TR key={lead.id}>
                    <TD>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block font-semibold text-foam hover:text-lavender transition-colors"
                      >
                        {lead.name}
                      </Link>
                      <span className="text-xs text-faint">
                        {[lead.contact, lead.city, lead.sector]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={LEAD_STATUS[lead.status].tone}>
                        {LEAD_STATUS[lead.status].label}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={TEMPERATURE[lead.temperature].tone}>
                        {TEMPERATURE[lead.temperature].label}
                      </Badge>
                    </TD>
                    <TD className="text-mist">{LEAD_SOURCE[lead.source].label}</TD>
                    <TD>
                      {lead.nextAction ? (
                        <>
                          <span className="block text-sm text-foam">
                            {lead.nextAction}
                          </span>
                          {lead.nextActionAt ? (
                            <span
                              className={
                                lead.nextActionAt < new Date()
                                  ? "text-xs font-semibold text-danger"
                                  : "text-xs text-faint"
                              }
                            >
                              {relativeDays(lead.nextActionAt)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TD>
                    <TD className="text-mist">{formatDate(lead.lastContactAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Cards móvil */}
          <ul className="space-y-3 md:hidden">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{lead.name}</p>
                    <Badge tone={TEMPERATURE[lead.temperature].tone}>
                      {TEMPERATURE[lead.temperature].label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={LEAD_STATUS[lead.status].tone}>
                      {LEAD_STATUS[lead.status].label}
                    </Badge>
                    <span className="text-xs text-faint">
                      {LEAD_SOURCE[lead.source].label}
                    </span>
                  </div>
                  {lead.nextAction ? (
                    <p className="mt-3 text-sm text-mist">
                      → {lead.nextAction}
                      {lead.nextActionAt ? (
                        <span
                          className={
                            lead.nextActionAt < new Date()
                              ? "ml-1.5 text-xs font-semibold text-danger"
                              : "ml-1.5 text-xs text-faint"
                          }
                        >
                          {relativeDays(lead.nextActionAt)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
