import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getOdooConfig } from "@/integrations/odoo/adapter";

export const metadata: Metadata = { title: "Odoo" };

const jobTypeLabel: Record<string, string> = {
  contacts_export: "Export contactos",
  contacts_import: "Import contactos",
  invoices_export: "Export facturas",
  invoices_import: "Import facturas",
  payments_import: "Import pagos",
  products_export: "Export productos",
  expenses_import: "Import gastos",
};

const jobStatusTone = {
  pending: "warn",
  running: "info",
  success: "ok",
  error: "danger",
  cancelled: "neutral",
} as const;

export default async function OdooPage() {
  const config = getOdooConfig();
  const [jobs, queueCount] = await Promise.all([
    prisma.odooSyncJob.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.invoiceDraftRequest.count({
      where: { deletedAt: null, status: { in: ["pending", "queued"] } },
    }),
  ]);

  return (
    <div>
      <Link
        href="/integrations"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Integraciones
      </Link>
      <PageHeader
        title="Odoo"
        subtitle="Fuente de verdad fiscal. KAIRAS OS prepara; Odoo emite."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Acciones CSV */}
          <Card>
            <CardHeader>
              <CardTitle>Modo CSV (operativo)</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="/finance/odoo-export"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-violet px-5 text-sm font-semibold text-white transition-colors hover:bg-violet/85"
                >
                  <Download className="h-4 w-4" />
                  Exportar cola de facturas ({queueCount})
                </a>
                <a
                  href="/integrations/odoo/contacts-export"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-foam transition-colors hover:bg-raise"
                >
                  <Download className="h-4 w-4" />
                  Exportar contactos (clientes)
                </a>
              </div>
              <div className="rounded-xl border border-line bg-ink/40 p-4 text-sm text-mist">
                <p className="k-label mb-2">Cómo importar en Odoo</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>
                    <strong className="text-foam">Contactos:</strong> Contactos →
                    ⚙ Importar registros → sube el CSV → Odoo mapea las columnas
                    automáticamente.
                  </li>
                  <li>
                    <strong className="text-foam">Facturas:</strong> Contabilidad →
                    Facturas de cliente → Importar. Se crean como{" "}
                    <em>borrador</em>: revisa y valida en Odoo (ahí ocurre lo
                    fiscal).
                  </li>
                  <li>
                    Tras emitir, registra el número de factura en Finanzas →
                    «Registrar factura Odoo» para el control de cobros.
                  </li>
                </ol>
              </div>
            </CardBody>
          </Card>

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle>Sincronizaciones ({jobs.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-faint">
                  Sin sincronizaciones aún. Cada export/import queda registrado aquí.
                </p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foam">
                        {jobTypeLabel[job.type] ?? job.type}
                        <span className="ml-2 text-xs text-faint">
                          {job.mode.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-faint">
                        {formatDateTime(job.createdAt)}
                        {job.itemsTotal != null ? ` · ${job.itemsTotal} elementos` : ""}
                        {job.fileName ? ` · ${job.fileName}` : ""}
                      </p>
                      {job.error ? (
                        <p className="mt-1 text-xs text-danger">{job.error}</p>
                      ) : null}
                    </div>
                    <Badge tone={jobStatusTone[job.status]}>
                      {job.status === "success"
                        ? "OK"
                        : job.status === "error"
                          ? "Error"
                          : job.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Estado */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mist">Modo activo</span>
                <Badge tone="violet">{config.mode.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">API</span>
                <Badge tone={config.apiConfigured ? "ok" : "neutral"}>
                  {config.apiConfigured ? "Credenciales OK" : "Sin credenciales"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Servidor</span>
                <span className="text-xs text-faint">
                  {config.baseUrl ?? "no definido"}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activar el modo API</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-mist">
              <p>
                Cuando tu plan de Odoo permita API externa, rellena en{" "}
                <code className="text-foam">.env</code>:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-ink px-3 py-2 text-xs text-faint">
                {`ODOO_BASE_URL=
ODOO_DB=
ODOO_USERNAME=
ODOO_API_KEY=
ODOO_INTEGRATION_MODE=api`}
              </pre>
              <p className="text-xs text-faint">
                El cliente JSON-RPC (contactos y facturas) ya está preparado en{" "}
                <code>src/integrations/odoo</code>. El modo Playwright queda
                deliberadamente sin implementar: requiere autorización explícita
                y nunca debe tocar datos fiscales sin revisión.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
