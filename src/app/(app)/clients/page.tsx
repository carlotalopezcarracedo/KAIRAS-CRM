import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CLIENT_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/utils";
import { listClients } from "@/server/services/client-service";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const clients = await listClients();
  const totalMrr = clients.reduce((acc, c) => acc + c.mrr, 0);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes · ${formatMoney(totalMrr)} MRR`}
        actions={
          <ButtonLink href="/clients/new">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </ButtonLink>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          title="Sin clientes todavía"
          hint="Crea un cliente manual o convierte un lead ganado desde su detalle."
          action={
            <ButtonLink href="/clients/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear cliente
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Cliente</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">MRR</TH>
                  <TH className="text-right">Proyectos activos</TH>
                  <TH>Contacto</TH>
                </tr>
              </THead>
              <TBody>
                {clients.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-semibold text-foam hover:text-lavender"
                      >
                        {c.name}
                      </Link>
                      <span className="block text-xs text-faint">
                        {[c.city, c.vatId].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={CLIENT_STATUS[c.status].tone}>
                        {CLIENT_STATUS[c.status].label}
                      </Badge>
                    </TD>
                    <TD className="text-right font-semibold text-foam">
                      {c.mrr > 0 ? formatMoney(c.mrr) : "—"}
                    </TD>
                    <TD className="text-right text-mist">{c.activeProjectsCount}</TD>
                    <TD className="text-mist">
                      {c.phone ?? c.billingEmail ?? "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Cards móvil */}
          <ul className="space-y-3 md:hidden">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{c.name}</p>
                    <Badge tone={CLIENT_STATUS[c.status].tone}>
                      {CLIENT_STATUS[c.status].label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-mist">
                    {c.mrr > 0 ? `${formatMoney(c.mrr)} MRR · ` : ""}
                    {c.activeProjectsCount} proyecto
                    {c.activeProjectsCount === 1 ? "" : "s"} activo
                    {c.activeProjectsCount === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
