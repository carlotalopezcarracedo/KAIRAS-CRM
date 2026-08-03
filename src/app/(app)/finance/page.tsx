import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Plus, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, formatDuration } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import {
  getFinanceOverview,
  listDrafts,
  listRecords,
} from "@/server/services/invoice-service";
import { DraftStatusSelect } from "./draft-status-select";
import { RecordStatusSelect } from "./record-status-select";
import { RecordDialog } from "./record-dialog";

export const metadata: Metadata = { title: "Finanzas" };

export default async function FinancePage() {
  const [overview, drafts, records, clients] = await Promise.all([
    getFinanceOverview(),
    listDrafts(),
    listRecords(),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const openDrafts = drafts.filter((d) =>
    ["pending", "queued", "sent_to_odoo", "error"].includes(d.status),
  );
  const linkableDrafts = drafts
    .filter((d) => ["pending", "queued", "sent_to_odoo"].includes(d.status))
    .map((d) => ({ id: d.id, concept: d.concept }));

  return (
    <div>
      <PageHeader
        title="Finanzas"
        subtitle="Control interno. La verdad fiscal vive en Odoo."
        actions={
          <>
            <a
              href="/finance/odoo-export"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-semibold text-mist transition-colors hover:text-foam"
            >
              <Download className="h-3.5 w-3.5" />
              CSV para Odoo
            </a>
            <RecordDialog clients={clients} drafts={linkableDrafts} />
            <ButtonLink href="/finance/queue/new" size="sm">
              <Plus className="h-4 w-4" />
              Solicitud de factura
            </ButtonLink>
          </>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pendiente de emitir"
          value={formatMoney(overview.pendingIssueSum)}
          hint={`${overview.pendingIssueCount} solicitudes en cola`}
          accent={overview.pendingIssueCount > 0}
        />
        <StatCard
          label="Pendiente de cobrar"
          value={formatMoney(overview.pendingCollectSum)}
          hint={`${overview.pendingCollectCount} facturas emitidas`}
        />
        <StatCard
          label="Cobrado este mes"
          value={formatMoney(overview.paidMonthSum)}
          hint={`${overview.paidMonthCount} facturas`}
        />
        <StatCard
          label="Horas aprobadas sin facturar"
          value={formatMoney(overview.approvedHoursAmount)}
          hint={formatDuration(overview.approvedHoursSeconds)}
          href="/finance/queue/new"
        />
      </div>

      <div className="space-y-5">
        {/* Cola de facturación */}
        <Card>
          <CardHeader>
            <CardTitle>Cola de facturación → Odoo ({openDrafts.length})</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {drafts.length === 0 ? (
              <p className="text-sm text-faint">
                Nada en cola. Se crean solicitudes desde propuestas aceptadas,
                recurrentes, horas aprobadas o manualmente.
              </p>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-ink/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foam">
                      {d.concept}
                    </p>
                    <p className="text-xs text-faint">
                      {d.client ? (
                        <Link
                          href={`/clients/${d.client.id}`}
                          className="hover:text-lavender"
                        >
                          {d.client.name}
                        </Link>
                      ) : (
                        "Sin cliente"
                      )}
                      {" · "}
                      {formatDate(d.createdAt)}
                      {d._count.timeEntries > 0
                        ? ` · ${d._count.timeEntries} entradas de tiempo`
                        : ""}
                      {d.invoiceRecord?.odooInvoiceNumber
                        ? ` · ${d.invoiceRecord.odooInvoiceNumber}`
                        : ""}
                    </p>
                    {d.error ? (
                      <p className="mt-1 text-xs text-danger">{d.error}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foam">
                      {formatMoney(d.amountTotal?.toString(), { cents: true })}
                    </span>
                    <DraftStatusSelect draftId={d.id} current={d.status} />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Snapshots de facturas */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas registradas (snapshot de Odoo)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {records.length === 0 ? (
              <p className="text-sm text-faint">
                Sin facturas registradas. Cuando emitas en Odoo, registra aquí el
                número y el importe para el control de cobros.
              </p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-ink/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foam">
                      {r.odooInvoiceNumber ?? "—"}{" "}
                      <span className="font-normal text-mist">
                        {r.concept ?? ""}
                      </span>
                    </p>
                    <p className="text-xs text-faint">
                      {r.client ? r.client.name : "Sin cliente"}
                      {r.issuedAt ? ` · emitida ${formatDate(r.issuedAt)}` : ""}
                      {r.dueAt ? ` · vence ${formatDate(r.dueAt)}` : ""}
                      {r.paidAt ? ` · cobrada ${formatDate(r.paidAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.odooUrl ? (
                      <a
                        href={r.odooUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-lavender hover:underline"
                      >
                        Ver en Odoo
                      </a>
                    ) : null}
                    <span className="text-sm font-bold text-foam">
                      {formatMoney(r.amountTotal?.toString(), { cents: true })}
                    </span>
                    <RecordStatusSelect recordId={r.id} current={r.status} />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
