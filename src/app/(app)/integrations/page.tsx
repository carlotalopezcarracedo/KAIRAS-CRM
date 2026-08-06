import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/server/db/prisma";
import { getOdooConfig } from "@/integrations/odoo/adapter";
import { getMetaConfig } from "@/integrations/meta/conversions-api";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Integraciones" };

export default async function IntegrationsPage() {
  const odoo = getOdooConfig();
  const meta = getMetaConfig();

  const [lastOdooJob, pendingMetaEvents, failedMetaEvents] = await Promise.all([
    prisma.odooSyncJob.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.metaEventLog.count({ where: { status: "pending" } }),
    prisma.metaEventLog.count({ where: { status: "failed" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Integraciones"
        subtitle="Odoo es la fuente fiscal. Meta recibe señales de conversión. KAIRAS OS orquesta."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/integrations/odoo"
          className="group rounded-card border border-line bg-surface p-6 transition-colors hover:border-line-strong"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foam">Odoo</h2>
              <p className="mt-1 text-sm text-mist">
                Facturas, cobros y vencimientos consultados en vivo mediante una
                conexión API sin operaciones de escritura.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="violet">Modo: {odoo.mode.toUpperCase()}</Badge>
            {odoo.mode === "api" ? (
              <>
                <Badge tone={odoo.apiConfigured ? "ok" : "warn"}>
                  {odoo.apiConfigured
                    ? "API configurada"
                    : "API sin credenciales"}
                </Badge>
                <Badge tone="violet">Solo lectura</Badge>
              </>
            ) : (
              <Badge tone="ok">CSV operativo</Badge>
            )}
            {lastOdooJob ? (
              <span className="text-xs text-faint">
                Última sync: {formatDateTime(lastOdooJob.createdAt)}
              </span>
            ) : (
              <span className="text-xs text-faint">Sin sincronizaciones aún</span>
            )}
          </div>
        </Link>

        <Link
          href="/integrations/meta"
          className="group rounded-card border border-line bg-surface p-6 transition-colors hover:border-line-strong"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foam">Meta Conversions API</h2>
              <p className="mt-1 text-sm text-mist">
                Señales de conversión del CRM hacia Meta Ads: leads, reuniones,
                ventas y recurrentes.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-faint transition-transform group-hover:translate-x-1 group-hover:text-lavender" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={meta.configured ? "ok" : "neutral"}>
              {meta.configured ? "Configurada" : "Sin configurar (solo registro)"}
            </Badge>
            {meta.testEventCode ? <Badge tone="warn">Modo test</Badge> : null}
            <span className="text-xs text-faint">
              {pendingMetaEvents} pendientes
              {failedMetaEvents > 0 ? ` · ${failedMetaEvents} fallidos` : ""}
            </span>
          </div>
        </Link>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-faint">
        Las credenciales viven en <code className="text-mist">.env</code> y nunca
        en el frontend ni en la base de datos. Sin credenciales, los módulos
        registran la actividad pero no llaman a ningún servicio externo.
      </p>
    </div>
  );
}
