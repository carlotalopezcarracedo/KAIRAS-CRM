import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, Pencil, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EXPENSE_KIND } from "@/lib/labels";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { parseMadridLocal } from "@/lib/dates";
import { listExpenses } from "@/server/services/expense-service";
import { EXPENSE_KINDS } from "@/server/validators/expense";
import { ImportTollsButton } from "./import-tolls-button";

export const metadata: Metadata = { title: "Gastos" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const kindFilter =
    typeof raw.kind === "string" && (EXPENSE_KINDS as readonly string[]).includes(raw.kind)
      ? raw.kind
      : undefined;
  const from = typeof raw.from === "string" && raw.from ? parseMadridLocal(raw.from) : undefined;
  const to = typeof raw.to === "string" && raw.to ? parseMadridLocal(raw.to) : undefined;

  const { expenses, byKind, stats } = await listExpenses({
    kind: kindFilter,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  });

  const mileage = byKind.find((r) => r.kind === "mileage");

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle={`${stats.count} apuntes · ${formatMoney(stats.amount)}`}
        actions={
          <>
            <ImportTollsButton />
            <ButtonLink href="/expenses/new">
              <Plus className="h-4 w-4" />
              Nuevo gasto
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total del filtro" value={formatMoney(stats.amount)} accent />
        <StatCard label="Este mes" value={formatMoney(stats.monthAmount)} />
        <StatCard
          label="Kilómetros"
          value={stats.km > 0 ? `${stats.km.toLocaleString("es-ES")} km` : "—"}
          hint={mileage ? `${mileage.count} desplazamientos` : undefined}
        />
        <StatCard label="Apuntes" value={stats.count} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/expenses"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            !kindFilter
              ? "border-violet-line bg-violet-soft text-lavender"
              : "border-line bg-surface text-faint hover:text-foam",
          )}
        >
          Todos
        </Link>
        {EXPENSE_KINDS.map((k) => {
          const row = byKind.find((r) => r.kind === k);
          return (
            <Link
              key={k}
              href={`/expenses?kind=${k}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                kindFilter === k
                  ? "border-violet-line bg-violet-soft text-lavender"
                  : "border-line bg-surface text-faint hover:text-foam",
              )}
            >
              {EXPENSE_KIND[k].label}
              {row ? ` · ${formatMoney(row.amount)}` : ""}
            </Link>
          );
        })}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          title={kindFilter ? "Nada de este tipo" : "Sin gastos todavía"}
          hint="Los peajes se traen de Odoo con el botón de arriba. Los desplazamientos, gasolina y dietas se registran a mano."
          action={
            <ButtonLink href="/expenses/new" size="sm">
              <Plus className="h-4 w-4" />
              Registrar gasto
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Fecha</TH>
                  <TH>Concepto</TH>
                  <TH>Tipo</TH>
                  <TH>Imputado a</TH>
                  <TH className="text-right">Detalle</TH>
                  <TH className="text-right">Importe</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {expenses.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap text-mist">{formatDate(e.expenseAt)}</TD>
                    <TD>
                      <span className="font-semibold text-foam">{e.description}</span>
                      {e.kind === "mileage" && e.originPlace ? (
                        <span className="block text-xs text-faint">
                          {e.originPlace} → {e.destinationPlace}
                          {e.roundTrip ? " (ida y vuelta)" : ""}
                        </span>
                      ) : null}
                      {e.supplier ? (
                        <span className="block text-xs text-faint">{e.supplier}</span>
                      ) : null}
                    </TD>
                    <TD>
                      <Badge tone={EXPENSE_KIND[e.kind].tone}>
                        {EXPENSE_KIND[e.kind].label}
                      </Badge>
                    </TD>
                    <TD className="text-mist">
                      {e.project?.name ?? e.client?.name ?? "—"}
                      {e.billable ? (
                        <span className="block text-xs text-ok">repercutible</span>
                      ) : null}
                    </TD>
                    <TD className="text-right text-xs text-faint">
                      {e.kind === "mileage" && e.kilometers
                        ? `${Number(e.kilometers)} km × ${Number(e.ratePerKm)} €`
                        : e.kind === "per_diem" && e.perDiemDays
                          ? `${e.perDiemDays} día(s)${e.overnight ? " con pernocta" : ""}`
                          : e.vatAmount
                            ? `IVA ${formatMoney(e.vatAmount.toString())}`
                            : "—"}
                    </TD>
                    <TD className="text-right font-semibold text-foam">
                      {formatMoney(e.amountTotal.toString())}
                    </TD>
                    <TD>
                      {e.source === "odoo" ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-faint"
                          title="Viene de Odoo: los importes no se editan aquí"
                        >
                          <Lock className="h-3 w-3" />
                          Odoo
                        </span>
                      ) : (
                        <Link
                          href={`/expenses/${e.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-lavender hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {expenses.map((e) => (
              <li key={e.id}>
                <Link
                  href={e.source === "odoo" ? "/expenses" : `/expenses/${e.id}/edit`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{e.description}</p>
                    <Badge tone={EXPENSE_KIND[e.kind].tone}>
                      {EXPENSE_KIND[e.kind].label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-faint">{formatDate(e.expenseAt)}</p>
                  <p className="mt-2 text-sm font-semibold text-foam">
                    {formatMoney(e.amountTotal.toString())}
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
