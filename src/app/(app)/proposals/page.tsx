import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, Pencil, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PROPOSAL_STATUS } from "@/lib/labels";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { listProposals } from "@/server/services/proposal-service";
import { PROPOSAL_STATUSES } from "@/server/validators/proposal";
import { ProposalStatusMenu } from "./status-menu";

export const metadata: Metadata = { title: "Propuestas" };

/** Filtros de la barra superior. "open" agrupa todo lo que sigue vivo. */
const FILTERS = [
  { value: undefined, label: "Todas" },
  { value: "open", label: "Vivas" },
  ...PROPOSAL_STATUSES.map((s) => ({ value: s, label: PROPOSAL_STATUS[s].label })),
];

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const statusFilter =
    typeof raw.status === "string" &&
    (raw.status === "open" || (PROPOSAL_STATUSES as readonly string[]).includes(raw.status))
      ? raw.status
      : undefined;
  const q = typeof raw.q === "string" && raw.q.trim() !== "" ? raw.q.trim() : undefined;

  const { proposals, stats } = await listProposals({ status: statusFilter, q });

  return (
    <div>
      <PageHeader
        title="Propuestas"
        subtitle={`${stats.openCount} vivas · ${stats.acceptedCount} aceptadas`}
        actions={
          <ButtonLink href="/proposals/new">
            <Plus className="h-4 w-4" />
            Nueva propuesta
          </ButtonLink>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vivas"
          value={stats.openCount}
          hint="borrador, enviadas y en seguimiento"
        />
        <StatCard
          label="Importe en juego"
          value={formatMoney(stats.openAmount)}
          hint="neto de las propuestas vivas"
          accent
        />
        <StatCard
          label="Aceptadas"
          value={formatMoney(stats.acceptedAmount)}
          hint={`${stats.acceptedCount} propuestas`}
        />
        <StatCard
          label="Tasa de aceptación"
          value={`${stats.winRate}%`}
          hint="aceptadas sobre vivas + aceptadas"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value ?? "all"}
            href={f.value ? `/proposals?status=${f.value}` : "/proposals"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === f.value
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title={statusFilter || q ? "Nada con este filtro" : "Sin propuestas todavía"}
          hint="Una propuesta puede colgar de un lead o de un cliente. Al aceptarla, crea el proyecto desde su ficha."
          action={
            <ButtonLink href="/proposals/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear propuesta
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Propuesta</TH>
                  <TH>Destinataria</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Neto</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Validez</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {proposals.map((p) => {
                  const expired =
                    p.validUntil &&
                    p.validUntil < new Date() &&
                    !["accepted", "rejected", "archived"].includes(p.status);
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link
                          href={`/proposals/${p.id}/edit`}
                          className="font-semibold text-foam hover:text-lavender"
                        >
                          {p.title}
                        </Link>
                        <span className="block text-xs text-faint">
                          {p.version > 1 ? `versión ${p.version}` : "versión 1"}
                          {p.opportunity ? ` · ${p.opportunity.title}` : ""}
                          {p._count.projects > 0
                            ? ` · ${p._count.projects} proyecto(s)`
                            : ""}
                        </span>
                      </TD>
                      <TD className="text-mist">
                        {p.client?.name ?? p.lead?.name ?? "—"}
                      </TD>
                      <TD>
                        <Badge tone={PROPOSAL_STATUS[p.status].tone}>
                          {PROPOSAL_STATUS[p.status].label}
                        </Badge>
                      </TD>
                      <TD className="text-right text-mist">
                        {formatMoney(p.amountNet?.toString())}
                      </TD>
                      <TD className="text-right text-mist">
                        {formatMoney(p.amountTotal?.toString())}
                      </TD>
                      <TD className={expired ? "font-semibold text-warn" : "text-mist"}>
                        {formatDate(p.validUntil)}
                        {expired ? " (caducada)" : ""}
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-2">
                          {p.documentUrl ? (
                            <a
                              href={p.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-faint hover:text-lavender"
                              aria-label={`Abrir documento de ${p.title}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                          <ProposalStatusMenu id={p.id} status={p.status} />
                          <Link
                            href={`/proposals/${p.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-lavender hover:underline"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Link>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {proposals.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/proposals/${p.id}/edit`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{p.title}</p>
                    <Badge tone={PROPOSAL_STATUS[p.status].tone}>
                      {PROPOSAL_STATUS[p.status].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {p.client?.name ?? p.lead?.name ?? "sin destinataria"}
                  </p>
                  <p className="mt-2 text-sm text-mist">
                    {formatMoney(p.amountTotal?.toString())} con IVA
                    {p.validUntil ? ` · válida hasta ${formatDate(p.validUntil)}` : ""}
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
