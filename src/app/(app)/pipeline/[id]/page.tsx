import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import {
  OPPORTUNITY_STAGE,
  PRIORITY,
  INTERACTION_CHANNEL,
  PROPOSAL_STATUS,
  TASK_STATUS,
} from "@/lib/labels";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  relativeDays,
} from "@/lib/utils";
import { getOpportunity } from "@/server/services/opportunity-service";
import { StageControl } from "./stage-control";
import { OpportunityNoteForm } from "./opportunity-note-form";
import { deleteOpportunityAction } from "../actions";

export const metadata: Metadata = { title: "Oportunidad" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="k-label shrink-0 pt-0.5">{label}</span>
      <span className="text-right text-sm text-foam">{value || "—"}</span>
    </div>
  );
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  const value = opp.estimatedValue ? Number(opp.estimatedValue) : 0;
  const weighted = (value * opp.probability) / 100;
  const overdue = opp.nextActionAt && opp.nextActionAt < new Date();

  return (
    <div>
      <Link
        href="/pipeline"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Pipeline
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">
            {opp.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={OPPORTUNITY_STAGE[opp.stage].tone}>
              {OPPORTUNITY_STAGE[opp.stage].label}
            </Badge>
            <Badge tone={PRIORITY[opp.priority].tone}>
              {PRIORITY[opp.priority].label}
            </Badge>
            {opp.lead ? (
              <Link
                href={`/leads/${opp.lead.id}`}
                className="text-xs font-semibold text-lavender hover:underline"
              >
                Lead: {opp.lead.name}
              </Link>
            ) : null}
            {opp.client ? (
              <Link
                href={`/clients/${opp.client.id}`}
                className="text-xs font-semibold text-lavender hover:underline"
              >
                Cliente: {opp.client.name}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href={`/pipeline/${opp.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </ButtonLink>
        </div>
      </div>

      {/* Dinero */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="k-label">Valor estimado</p>
          <p className="mt-1 text-xl font-extrabold text-foam">{formatMoney(value)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="k-label">Probabilidad</p>
          <p className="mt-1 text-xl font-extrabold text-foam">{opp.probability}%</p>
        </div>
        <div className="rounded-card border border-violet-line bg-violet-soft p-4">
          <p className="k-label">Ponderado</p>
          <p className="mt-1 text-xl font-extrabold text-lavender">
            {formatMoney(
              opp.stage === "won" && opp.acceptedValue
                ? Number(opp.acceptedValue)
                : weighted,
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Etapa</CardTitle>
            </CardHeader>
            <CardBody>
              <StageControl
                opportunityId={opp.id}
                current={opp.stage}
                estimatedValue={value || null}
              />
              {opp.lostReason ? (
                <p className="mt-3 text-sm text-danger">
                  Motivo de pérdida: {opp.lostReason}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card className={overdue ? "border-danger/30" : opp.nextAction ? "border-violet-line" : ""}>
            <CardHeader>
              <CardTitle>Siguiente acción</CardTitle>
              {opp.nextActionAt ? (
                <span
                  className={
                    overdue
                      ? "text-xs font-bold text-danger"
                      : "text-xs font-semibold text-lavender"
                  }
                >
                  {relativeDays(opp.nextActionAt)} · {formatDateTime(opp.nextActionAt)}
                </span>
              ) : null}
            </CardHeader>
            <CardBody>
              {opp.nextAction ? (
                <p className="text-base font-semibold text-foam">{opp.nextAction}</p>
              ) : (
                <p className="text-sm text-faint">
                  Sin siguiente acción. Una oportunidad sin siguiente acción es dinero
                  parado.
                </p>
              )}
            </CardBody>
          </Card>

          {opp.tasks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tareas abiertas ({opp.tasks.length})</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {opp.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks?focus=${task.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5 hover:border-line-strong"
                  >
                    <span className="text-sm font-medium text-foam">{task.title}</span>
                    <div className="flex items-center gap-2">
                      {task.dueAt ? (
                        <span className="text-xs text-faint">{formatDate(task.dueAt)}</span>
                      ) : null}
                      <Badge tone={TASK_STATUS[task.status].tone}>
                        {TASK_STATUS[task.status].label}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {opp.proposals.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Propuestas</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {opp.proposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-foam">{p.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-mist">
                        {formatMoney(p.amountTotal?.toString())}
                      </span>
                      <Badge tone={PROPOSAL_STATUS[p.status].tone}>
                        {PROPOSAL_STATUS[p.status].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <AttachmentsPanel
            entityType="opportunity"
            entityId={opp.id}
            revalidatePath={`/pipeline/${opp.id}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>Notas ({opp.notes.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <OpportunityNoteForm opportunityId={opp.id} />
              {opp.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-line bg-ink/40 px-4 py-3"
                >
                  <p className="whitespace-pre-wrap text-sm text-mist">{note.content}</p>
                  <p className="mt-2 text-xs text-faint">{formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {opp.interactions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Interacciones</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {opp.interactions.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl border border-line bg-ink/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={INTERACTION_CHANNEL[it.channel].tone}>
                        {INTERACTION_CHANNEL[it.channel].label}
                      </Badge>
                      <span className="text-xs text-faint">
                        {formatDateTime(it.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foam">{it.summary}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-line">
              <InfoRow label="Servicio" value={opp.service?.name} />
              <InfoRow label="Cierre previsto" value={formatDate(opp.expectedCloseAt)} />
              <InfoRow
                label="Urgencia"
                value={opp.urgencyLevel != null ? `${opp.urgencyLevel}/5` : null}
              />
              <InfoRow
                label="Encaje KAIRAS"
                value={opp.kairasFit != null ? `${opp.kairasFit}/5` : null}
              />
              <InfoRow label="Coste de no resolver" value={opp.costOfInaction} />
              <InfoRow
                label="Valor aceptado"
                value={
                  opp.acceptedValue ? formatMoney(Number(opp.acceptedValue)) : null
                }
              />
              <InfoRow label="Creada" value={formatDate(opp.createdAt)} />
            </CardBody>
          </Card>

          {opp.observations ? (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-mist">
                  {opp.observations}
                </p>
              </CardBody>
            </Card>
          ) : null}

          <div className="flex justify-end">
            <ConfirmDelete
              action={deleteOpportunityAction.bind(null, opp.id)}
              title="Eliminar oportunidad"
              description={`"${opp.title}" se archivará (borrado suave).`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
