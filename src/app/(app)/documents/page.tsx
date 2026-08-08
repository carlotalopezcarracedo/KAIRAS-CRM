import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ADMIN_DOC_CATEGORY } from "@/lib/labels";
import { formatMoney, formatDate, relativeDays, cn } from "@/lib/utils";
import { listAdminDocuments } from "@/server/services/admin-document-service";
import { ADMIN_DOC_CATEGORIES } from "@/server/validators/admin-document";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const category =
    typeof raw.category === "string" &&
    (ADMIN_DOC_CATEGORIES as readonly string[]).includes(raw.category)
      ? raw.category
      : undefined;
  const yearParam = typeof raw.year === "string" ? Number(raw.year) : NaN;
  const fiscalYear = Number.isInteger(yearParam) ? yearParam : undefined;

  const { documents, byCategory, years, expiring, stats } = await listAdminDocuments({
    category,
    fiscalYear,
  });

  const expiredCount = expiring.filter((d) => d.expired).length;

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Tu carpeta administrativa: modelos, seguros, contratos y certificados"
        actions={
          <ButtonLink href="/documents/new">
            <Plus className="h-4 w-4" />
            Nuevo documento
          </ButtonLink>
        }
      />

      {expiring.length > 0 ? (
        <div className="mb-5 rounded-card border border-warn/25 bg-warn-soft/50 px-4 py-3">
          <p className="k-label mb-1.5 flex items-center gap-2 text-warn">
            <AlertTriangle className="h-3.5 w-3.5" />
            {expiredCount > 0 ? "Caducado" : "Caduca pronto"}
          </p>
          <ul className="space-y-1">
            {expiring.map((doc) => (
              <li key={doc.id} className="text-sm">
                <Link href={`/documents/${doc.id}`} className="text-foam hover:text-lavender">
                  {doc.title}
                </Link>
                <span className={cn("ml-2 text-xs", doc.expired ? "text-danger" : "text-warn")}>
                  {doc.expired ? "caducado" : "caduca"} {relativeDays(doc.validUntil)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Documentos" value={stats.total} />
        <StatCard
          label="Caducidades a vigilar"
          value={stats.expiringCount}
          hint="caducados o en los próximos 60 días"
          accent={stats.expiringCount > 0}
        />
        <StatCard label="Ejercicios" value={years.length > 0 ? years.join(" · ") : "—"} />
      </div>

      {years.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Link
            href={category ? `/documents?category=${category}` : "/documents"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              !fiscalYear
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            Todos los años
          </Link>
          {years.map((year) => (
            <Link
              key={year}
              href={`/documents?year=${year}${category ? `&category=${category}` : ""}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                fiscalYear === year
                  ? "border-violet-line bg-violet-soft text-lavender"
                  : "border-line bg-surface text-faint hover:text-foam",
              )}
            >
              {year}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href={fiscalYear ? `/documents?year=${fiscalYear}` : "/documents"}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            !category
              ? "border-violet-line bg-violet-soft text-lavender"
              : "border-line bg-surface text-faint hover:text-foam",
          )}
        >
          Todas
        </Link>
        {ADMIN_DOC_CATEGORIES.filter((c) =>
          byCategory.some((row) => row.category === c),
        ).map((c) => (
          <Link
            key={c}
            href={`/documents?category=${c}${fiscalYear ? `&year=${fiscalYear}` : ""}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              category === c
                ? "border-violet-line bg-violet-soft text-lavender"
                : "border-line bg-surface text-faint hover:text-foam",
            )}
          >
            {ADMIN_DOC_CATEGORY[c].label}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title={category || fiscalYear ? "Nada con este filtro" : "Sin documentos todavía"}
          hint="Guarda aquí el alta censal, los modelos que presentas, el seguro, el certificado digital y los contratos. Con su caducidad, KAIRAS te avisa antes de que expiren."
          action={
            <ButtonLink href="/documents/new" size="sm">
              <Plus className="h-4 w-4" />
              Añadir documento
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Documento</TH>
                  <TH>Categoría</TH>
                  <TH>Ejercicio</TH>
                  <TH>Emitido</TH>
                  <TH>Caduca</TH>
                  <TH className="text-right">Importe</TH>
                </tr>
              </THead>
              <TBody>
                {documents.map((d) => {
                  const expired = d.validUntil && d.validUntil < new Date();
                  return (
                    <TR key={d.id}>
                      <TD>
                        <Link
                          href={`/documents/${d.id}`}
                          className="font-semibold text-foam hover:text-lavender"
                        >
                          {d.title}
                        </Link>
                        {d.issuer || d.reference ? (
                          <span className="block text-xs text-faint">
                            {[d.issuer, d.reference].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </TD>
                      <TD>
                        <Badge tone={ADMIN_DOC_CATEGORY[d.category].tone}>
                          {ADMIN_DOC_CATEGORY[d.category].label}
                        </Badge>
                      </TD>
                      <TD className="text-mist">
                        {d.fiscalYear ?? "—"}
                        {d.fiscalPeriod ? ` · ${d.fiscalPeriod}` : ""}
                      </TD>
                      <TD className="text-mist">{formatDate(d.issuedAt)}</TD>
                      <TD className={expired ? "font-semibold text-danger" : "text-mist"}>
                        {formatDate(d.validUntil)}
                        {expired ? " (caducado)" : ""}
                      </TD>
                      <TD className="text-right text-mist">
                        {formatMoney(d.amount?.toString())}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {documents.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/documents/${d.id}`}
                  className="block rounded-card border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foam">{d.title}</p>
                    <Badge tone={ADMIN_DOC_CATEGORY[d.category].tone}>
                      {ADMIN_DOC_CATEGORY[d.category].label}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-mist">
                    {d.fiscalYear ? `${d.fiscalYear}${d.fiscalPeriod ? ` · ${d.fiscalPeriod}` : ""}` : "sin ejercicio"}
                    {d.validUntil ? ` · caduca ${formatDate(d.validUntil)}` : ""}
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
