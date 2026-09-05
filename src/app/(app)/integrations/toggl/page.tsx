import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getTogglConfig } from "@/integrations/toggl/adapter";
import { getTogglSettings } from "@/server/services/toggl-connection-service";
import { listSyncRuns } from "@/server/services/toggl-sync-service";
import {
  listProjectMappings,
  countUnassignedEntries,
  getImportedEntriesSummary,
} from "@/server/services/toggl-mapping-service";
import { getWebhookStatus } from "@/server/services/toggl-webhook-service";
import { countPendingPushes } from "@/server/services/toggl-push-service";
import { requireUser } from "@/server/auth";
import { ConnectionPanel } from "./connection-panel";
import { WebhookPanel } from "./webhook-panel";
import { RetryPendingButton } from "./retry-pending-button";
import { ImportHistoricalForm } from "./import-form";
import { ContinueImportButton } from "./continue-import-button";
import { SyncNowButton } from "./sync-now-button";
import { MappingTable } from "./mapping-table";

export const metadata: Metadata = { title: "Toggl Track" };

const runKindLabel: Record<string, string> = {
  historical_import: "Import histórico",
  reconciliation: "Sincronizar ahora",
};

const runStatusTone = {
  running: "info",
  success: "ok",
  partial: "warn",
  error: "danger",
} as const;

const runStatusLabel: Record<string, string> = {
  running: "En curso",
  success: "OK",
  partial: "Parcial",
  error: "Error",
};

/** Minutos aproximados hasta que se reinicie la cuota de Toggl, desde el momento en que se observó. */
function minutesRemaining(resetsInSeconds: number, observedAt: string | null): number {
  const observedMs = observedAt ? new Date(observedAt).getTime() : Date.now();
  const elapsedSeconds = Math.max(0, (Date.now() - observedMs) / 1000);
  return Math.max(0, Math.ceil((resetsInSeconds - elapsedSeconds) / 60));
}

export default async function TogglIntegrationPage() {
  const config = getTogglConfig();
  const me = await requireUser();
  const [
    settings,
    runs,
    mappings,
    unassignedCount,
    kairasProjects,
    pendingLocal,
    webhook,
    pendingPush,
    role,
    importedSummary,
  ] = await Promise.all([
    getTogglSettings(),
    listSyncRuns(20),
    listProjectMappings(),
    countUnassignedEntries(),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.timeEntry.count({ where: { syncStatus: "pending" } }),
    getWebhookStatus(),
    countPendingPushes(),
    prisma.user
      .findUnique({ where: { id: me.id }, select: { role: true } })
      .then((u) => u?.role ?? "member"),
    getImportedEntriesSummary(),
  ]);

  const latestResumableImport = runs.find(
    (r) => r.kind === "historical_import" && r.resumable,
  );

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
        title="Toggl Track"
        subtitle="Kairas es la interfaz principal de horas. Toggl es un método alternativo que se reconcilia manualmente."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conexión</CardTitle>
            </CardHeader>
            <CardBody>
              <ConnectionPanel configured={config.configured} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook (Toggl → Kairas)</CardTitle>
            </CardHeader>
            <CardBody>
              <WebhookPanel {...webhook} canManage={role === "owner"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendientes de subir a Toggl</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-mist">
                {pendingPush === 0
                  ? "Todas las entradas creadas en Kairas están sincronizadas."
                  : `${pendingPush} entrada(s) creadas en Kairas no han llegado a Toggl.`}
              </p>
              <RetryPendingButton count={pendingPush} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Importar histórico</CardTitle>
            </CardHeader>
            <CardBody>
              <ImportHistoricalForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datos importados de Toggl</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="k-label">Total</p>
                  <p className="mt-1 text-lg font-bold text-foam">{importedSummary.total}</p>
                </div>
                <div>
                  <p className="k-label">Asignadas</p>
                  <p className="mt-1 text-lg font-bold text-ok">{importedSummary.assigned}</p>
                </div>
                <div>
                  <p className="k-label">Sin asignar</p>
                  <p className="mt-1 text-lg font-bold text-warn">{importedSummary.unassigned}</p>
                </div>
                <div>
                  <p className="k-label">Proyectos Toggl</p>
                  <p className="mt-1 text-lg font-bold text-foam">
                    {importedSummary.distinctTogglProjects}
                  </p>
                </div>
              </div>
              {importedSummary.earliestStartedAt && importedSummary.latestStartedAt ? (
                <p className="mt-3 text-xs text-faint">
                  Rango: {formatDateTime(importedSummary.earliestStartedAt)} —{" "}
                  {formatDateTime(importedSummary.latestStartedAt)}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapeo de proyectos</CardTitle>
            </CardHeader>
            <CardBody>
              <MappingTable mappings={mappings} kairasProjects={kairasProjects} />
              {unassignedCount > 0 ? (
                <p className="mt-3 text-xs text-warn">
                  {unassignedCount} entrada(s) importadas siguen &quot;Sin asignar&quot;.
                  Confirma su proyecto arriba para reasignarlas automáticamente.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de sincronizaciones ({runs.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {runs.length === 0 ? (
                <p className="text-sm text-faint">Todavía no se ha ejecutado ninguna.</p>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foam">
                        {runKindLabel[run.kind] ?? run.kind}
                      </p>
                      <p className="text-xs text-faint">
                        {formatDateTime(run.startedAt)}
                        {" · "}
                        recibidas {run.itemsReceived} · creadas {run.itemsCreated} · actualizadas{" "}
                        {run.itemsUpdated} · sin cambios {run.itemsUnchanged} · sin asignar{" "}
                        {run.itemsUnassigned} · eliminadas {run.itemsDeleted}
                        {run.itemsError > 0 ? ` · errores ${run.itemsError}` : ""}
                      </p>
                      {run.error ? (
                        <p className={`mt-1 text-xs ${run.status === "error" ? "text-danger" : "text-warn"}`}>
                          {run.error}
                          {run.resumable && run.quotaResetsInSeconds != null
                            ? ` Podrás continuar en ~${minutesRemaining(run.quotaResetsInSeconds, run.quotaObservedAt)} min.`
                            : ""}
                        </p>
                      ) : null}
                      {run.resumable ? (
                        <p className="mt-1 text-xs text-faint">
                          {run.pendingWindows} ventana(s) pendiente(s) de reintentar
                          {run.unreachableWindows > 0
                            ? ` · ${run.unreachableWindows} fuera de alcance (no se reintentan)`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={runStatusTone[run.status]}>
                      {runStatusLabel[run.status] ?? run.status}
                    </Badge>
                  </div>
                ))
              )}
              {latestResumableImport && role === "owner" ? (
                <div className="pt-1">
                  <ContinueImportButton />
                </div>
              ) : null}
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
                <span className="text-mist">Token</span>
                <Badge tone={config.configured ? "ok" : "neutral"}>
                  {config.configured ? "Configurado" : "Sin configurar"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mist">Cuenta</span>
                <span className="truncate text-xs text-faint">
                  {settings.accountEmail ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mist">Workspace</span>
                <span className="truncate text-xs text-faint">
                  {settings.workspaceName ?? "sin elegir"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Última comprobación</span>
                <span className="text-xs text-faint">
                  {settings.lastCheckedAt ? formatDateTime(settings.lastCheckedAt) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Última importación</span>
                <span className="text-xs text-faint">
                  {settings.lastImportAt ? formatDateTime(settings.lastImportAt) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Última sincronización</span>
                <span className="text-xs text-faint">
                  {settings.lastReconciledAt
                    ? formatDateTime(new Date(settings.lastReconciledAt * 1000))
                    : "—"}
                </span>
              </div>
              {pendingLocal > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-mist">Horas de Kairas por enviar</span>
                  <Badge tone="warn">{pendingLocal}</Badge>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <SyncNowButton />
              <p className="mt-3 text-xs text-faint">
                Trae los cambios de Toggl (creaciones, ediciones y borrados) desde
                la última sincronización con éxito. No hace falta comprobar la
                conexión antes: usa el workspace ya guardado.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobre esta integración</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-mist">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lavender" />
                El token de Toggl vive solo en el servidor
                (<code className="text-foam">TOGGL_API_TOKEN</code>) y nunca llega
                al navegador.
              </p>
              <p>
                Kairas → Toggl ya es automático: crear, editar, borrar y el
                cronómetro se envían solos. Toggl → Kairas sigue siendo manual
                (&quot;Sincronizar ahora&quot; o importar histórico); el
                webhook en tiempo real está preparado pero aún no activado.
              </p>
              <p>
                Si el envío automático falla, la hora queda &quot;Pendiente&quot;
                en Kairas sin perderse — se puede reintentar arriba.
              </p>
              <p>
                El import histórico usa el Reports API de Toggl (cubre todo tu
                histórico real, sin límite artificial de antigüedad). La
                sincronización del día a día (reconciliación y webhook) sigue
                usando la API de seguimiento normal.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
