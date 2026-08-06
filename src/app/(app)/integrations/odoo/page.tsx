import type { Metadata } from "next";
import { Suspense } from "react";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Cloud,
  Download,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getOdooConfig } from "@/integrations/odoo/adapter";
import { getOdooFinancialSnapshot } from "@/integrations/odoo/finance";

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

async function ApiReadOnlyCard() {
  const snapshot = await getOdooFinancialSnapshot();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>API financiera de Odoo</CardTitle>
          <p className="mt-1 text-xs text-faint">JSON-2 · account.move</p>
        </div>
        <Badge tone="violet">
          <ShieldCheck className="h-3 w-3" /> Solo lectura
        </Badge>
      </CardHeader>
      <CardBody>
        {snapshot.ok ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ok">
                <Cloud className="h-3 w-3" /> Conexión verificada
              </Badge>
              <span className="text-xs text-faint">
                {snapshot.summary.records} facturas visibles · consultado{" "}
                {formatDateTime(snapshot.fetchedAt)}
              </span>
            </div>
            <p className="mt-4 text-sm text-mist">
              KAIRAS consulta facturas, estados de cobro, importes y vencimientos
              directamente en Odoo. Los datos no se copian ni se modifican.
            </p>
            <Link
              href="/finance#odoo-readonly"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-violet px-5 text-sm font-semibold text-white transition-colors hover:bg-violet/85"
            >
              Ver finanzas de Odoo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-foam">
                Conexión no disponible
              </p>
              <p className="mt-1 text-sm text-mist">{snapshot.message}</p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ApiReadOnlyCardSkeleton() {
  return (
    <Card>
      <CardBody>
        <div className="h-5 w-48 animate-pulse rounded bg-raise" />
        <div className="mt-4 h-14 animate-pulse rounded bg-raise" />
      </CardBody>
    </Card>
  );
}

function CsvOperationsCard({ queueCount }: { queueCount: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modo CSV</CardTitle>
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
            Exportar contactos
          </a>
        </div>
        <p className="text-sm text-mist">
          Este flujo genera archivos para importación manual. No realiza llamadas
          de escritura a la API de Odoo.
        </p>
      </CardBody>
    </Card>
  );
}

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
        subtitle="La verdad fiscal se consulta desde Odoo; KAIRAS no la modifica."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {config.mode === "api" ? (
            <Suspense fallback={<ApiReadOnlyCardSkeleton />}>
              <ApiReadOnlyCard />
            </Suspense>
          ) : (
            <CsvOperationsCard queueCount={queueCount} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historial interno ({jobs.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-faint">
                  Sin exportaciones o importaciones registradas en KAIRAS.
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
                        {job.itemsTotal != null
                          ? ` · ${job.itemsTotal} elementos`
                          : ""}
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
                <span className="text-mist">Protocolo</span>
                <span className="text-xs font-semibold text-foam">JSON-2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Configuración</span>
                <Badge tone={config.apiConfigured ? "ok" : "neutral"}>
                  {config.apiConfigured ? "Completa" : "Incompleta"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mist">Servidor</span>
                <span className="truncate text-xs text-faint">
                  {config.baseUrl ?? "no definido"}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protección de datos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-mist">
              <p>
                El cliente de KAIRAS solo contiene una consulta fija a facturas de
                cliente: <code className="text-foam">search_read</code>.
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-faint">
                <li>Sin crear, editar, validar ni eliminar facturas.</li>
                <li>Sin sincronización inversa hacia Odoo.</li>
                <li>Sin persistir los datos de Odoo en KAIRAS.</li>
              </ul>
              <p className="rounded-xl border border-warn/25 bg-warn-soft p-3 text-xs text-warn">
                Para una garantía completa, la API key debe pertenecer a un usuario
                dedicado de Odoo con permisos de modelo solo Read.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
