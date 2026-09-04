import { IntentLink as Link } from "@/components/navigation/intent-link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { TIME_ENTRY_ORIGIN, TIME_SYNC_STATUS, TIME_ENTRY_STATUS } from "@/lib/labels";
import { formatDuration, formatMoney, formatDate, formatDateTime } from "@/lib/utils";
import { parseMadridLocal } from "@/lib/dates";
import {
  listEntriesForProject,
  getProjectTimeSummary,
} from "@/server/services/time-service";
import { StartTimerButton } from "../../time/start-timer-button";
import { ManualEntryDialog } from "../../time/manual-entry-dialog";
import { deleteEntryAction } from "../../time/actions";
import { ProjectTimeFilters } from "./project-time-filters";
import type { TimeEntryOrigin } from "@prisma/client";

/**
 * Sección "Tiempo" de la ficha de proyecto: horas + cronómetro + entrada
 * manual + filtros, todo reutilizando `time-service.ts` y los componentes
 * existentes del módulo Tiempo (nada de esto reimplementa el cronómetro).
 */
export async function ProjectTimePanel({
  projectId,
  clientId,
  mainServiceId,
  projectName,
  clients,
  projects,
  raw,
}: {
  projectId: string;
  clientId: string;
  mainServiceId: string | null;
  projectName: string;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  raw: Record<string, string | string[] | undefined>;
}) {
  const tFrom = typeof raw.tFrom === "string" && raw.tFrom ? raw.tFrom : undefined;
  const tTo = typeof raw.tTo === "string" && raw.tTo ? raw.tTo : undefined;
  const tQ = typeof raw.tQ === "string" && raw.tQ ? raw.tQ : undefined;
  const tBillable =
    raw.tBillable === "1" ? true : raw.tBillable === "0" ? false : undefined;
  const tOrigin =
    raw.tOrigin === "kairas" || raw.tOrigin === "toggl"
      ? (raw.tOrigin as TimeEntryOrigin)
      : undefined;

  const [entries, summary] = await Promise.all([
    listEntriesForProject(projectId, {
      from: tFrom ? parseMadridLocal(tFrom) : undefined,
      to: tTo ? parseMadridLocal(tTo + "T23:59:59") : undefined,
      q: tQ,
      billable: tBillable,
      origin: tOrigin,
    }),
    getProjectTimeSummary(projectId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiempo ({entries.length})</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={formatDuration(summary.totalSeconds)} />
          <StatCard label="Este mes" value={formatDuration(summary.monthSeconds)} />
          <StatCard label="Facturable" value={formatDuration(summary.billableSeconds)} />
          <StatCard label="No facturable" value={formatDuration(summary.nonBillableSeconds)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <StartTimerButton
            projectId={projectId}
            clientId={clientId}
            serviceId={mainServiceId}
            title={projectName}
          />
          <ManualEntryDialog
            clients={clients}
            projects={projects}
            extraDefaults={{ projectId, clientId }}
            triggerLabel="+ Añadir tiempo"
          />
        </div>

        <ProjectTimeFilters />

        {entries.length === 0 ? (
          <EmptyState
            title="Sin horas registradas con estos filtros"
            hint="Inicia el cronómetro o añade tiempo manualmente."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Descripción</TH>
                <TH>Duración</TH>
                <TH>Origen</TH>
                <TH>Facturable</TH>
                <TH>Sync</TH>
                <TH>Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TR key={entry.id}>
                  <TD className="whitespace-nowrap text-xs text-mist">
                    {formatDate(entry.startedAt)}
                    {!entry.endedAt ? (
                      <Badge tone="violet" className="ml-2">
                        Activa
                      </Badge>
                    ) : null}
                  </TD>
                  <TD>
                    <Link
                      href={`/time/${entry.id}`}
                      className="font-medium text-foam hover:text-lavender"
                    >
                      {entry.title || "Sin descripción"}
                    </Link>
                    {entry.status !== "draft" ? (
                      <span className="ml-2">
                        <Badge tone={TIME_ENTRY_STATUS[entry.status].tone}>
                          {TIME_ENTRY_STATUS[entry.status].label}
                        </Badge>
                      </span>
                    ) : null}
                  </TD>
                  <TD className="font-mono text-xs font-bold tabular-nums text-foam">
                    {entry.endedAt ? formatDuration(entry.durationSeconds) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={TIME_ENTRY_ORIGIN[entry.origin].tone}>
                      {TIME_ENTRY_ORIGIN[entry.origin].label}
                    </Badge>
                  </TD>
                  <TD>
                    {entry.billable ? (
                      <span className="text-xs font-semibold text-lavender">
                        {formatMoney(entry.calculatedAmount?.toString())}
                      </span>
                    ) : (
                      <span className="text-xs text-faint">no</span>
                    )}
                  </TD>
                  <TD>
                    <span title={entry.lastSyncError ?? undefined}>
                      <Badge tone={TIME_SYNC_STATUS[entry.syncStatus].tone}>
                        {TIME_SYNC_STATUS[entry.syncStatus].label}
                      </Badge>
                    </span>
                    {entry.lastSyncedAt ? (
                      <p className="mt-0.5 text-[10px] text-faint">
                        {formatDateTime(entry.lastSyncedAt)}
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/time/${entry.id}`}
                        className="text-xs font-semibold text-faint hover:text-foam"
                      >
                        Editar
                      </Link>
                      <ConfirmDelete
                        action={deleteEntryAction.bind(null, entry.id)}
                        title="Eliminar entrada"
                        description="La entrada se archivará (borrado suave)."
                        buttonLabel=""
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
