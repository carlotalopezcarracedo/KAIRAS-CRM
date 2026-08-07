import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CAMPAIGN_CHANNEL, CAMPAIGN_STATUS } from "@/lib/labels";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { listCampaigns } from "@/server/services/campaign-service";
import { CAMPAIGN_STATUSES } from "@/server/validators/campaign";

export const metadata: Metadata = { title: "Campañas" };

function formatRoas(roas: number | null): string {
  if (roas === null) return "—";
  return `${roas.toFixed(2)}×`;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const statusFilter =
    typeof raw.status === "string" &&
    (CAMPAIGN_STATUSES as readonly string[]).includes(raw.status)
      ? raw.status
      : undefined;

  const { campaigns, stats } = await listCampaigns({ status: statusFilter });

  return (
    <div>
      <PageHeader
        title="Campañas"
        subtitle={`${campaigns.length} campañas · ${stats.activeCount} activas`}
        actions={
          <ButtonLink href="/campaigns/new">
            <Plus className="h-4 w-4" />
            Nueva campaña
          </ButtonLink>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inversión"
          value={formatMoney(stats.spent)}
          hint={stats.budget > 0 ? `de ${formatMoney(stats.budget)} presupuestados` : undefined}
        />
        <StatCard label="Leads generados" value={stats.leads} />
        <StatCard
          label="Coste por lead"
          value={stats.costPerLead !== null ? formatMoney(stats.costPerLead) : "—"}
          hint="inversión ÷ leads"
        />
        <StatCard
          label="Ventas atribuidas"
          value={formatMoney(stats.won)}
          hint={`ROAS ${formatRoas(stats.roas)}`}
          accent
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/campaigns"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            !statusFilter
              ? "border-violet-line bg-violet-soft text-lavender"
              : "border-line bg-surface text-faint hover:text-foam",
          )}
        >
          Todas
        </Link>
        {CAMPAIGN_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/campaigns?status=${s}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {CAMPAIGN_STATUS[s].label}
          </Link>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title={statusFilter ? "Nada con este estado" : "Sin campañas todavía"}
          hint="Al crear un lead puedes asignarlo a una campaña: así se calculan solos el coste por lead y las ventas atribuidas."
          action={
            <ButtonLink href="/campaigns/new" size="sm">
              <Plus className="h-4 w-4" />
              Crear campaña
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Campaña</TH>
                  <TH>Canal</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Invertido</TH>
                  <TH className="text-right">Leads</TH>
                  <TH className="text-right">Coste/lead</TH>
                  <TH className="text-right">Ganadas</TH>
                  <TH className="text-right">ROAS</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {campaigns.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <span className="font-semibold text-foam">{c.name}</span>
                      <span className="block text-xs text-faint">
                        {c.startAt ? formatDate(c.startAt) : "sin fecha"}
                        {c.endAt ? ` → ${formatDate(c.endAt)}` : ""}
                        {c.budgetUsedPct !== null ? ` · ${c.budgetUsedPct}% del presupuesto` : ""}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={CAMPAIGN_CHANNEL[c.channel].tone}>
                        {CAMPAIGN_CHANNEL[c.channel].label}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={CAMPAIGN_STATUS[c.status].tone}>
                        {CAMPAIGN_STATUS[c.status].label}
                      </Badge>
                    </TD>
                    <TD className="text-right text-mist">{formatMoney(c.spentAmount)}</TD>
                    <TD className="text-right text-mist">{c.leadsCount}</TD>
                    <TD className="text-right text-mist">
                      {c.costPerLead !== null ? formatMoney(c.costPerLead) : "—"}
                    </TD>
                    <TD className="text-right text-mist">
                      {c.wonCount > 0 ? (
                        <>
                          {c.wonCount}
                          <span className="block text-xs text-faint">
                            {formatMoney(c.wonValue)}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD
                      className={cn(
                        "text-right font-semibold",
                        c.roas === null
                          ? "text-mist"
                          : c.roas >= 1
                            ? "text-ok"
                            : "text-danger",
                      )}
                    >
                      {formatRoas(c.roas)}
                    </TD>
                    <TD>
                      <Link
                        href={`/campaigns/${c.id}/edit`}
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
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campaigns/${c.id}/edit`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{c.name}</p>
                    <Badge tone={CAMPAIGN_STATUS[c.status].tone}>
                      {CAMPAIGN_STATUS[c.status].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {CAMPAIGN_CHANNEL[c.channel].label}
                  </p>
                  <p className="mt-2 text-sm text-mist">
                    {c.leadsCount} leads · {formatMoney(c.spentAmount)} invertidos
                    {c.roas !== null ? ` · ROAS ${formatRoas(c.roas)}` : ""}
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
