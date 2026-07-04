import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone,
  Mail,
  AtSign,
  Globe,
  MessageCircle,
  Pencil,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LEAD_STATUS,
  TEMPERATURE,
  LEAD_SOURCE,
  INTERACTION_CHANNEL,
  OPPORTUNITY_STAGE,
} from "@/lib/labels";
import { formatDate, formatDateTime, formatMoney, relativeDays } from "@/lib/utils";
import { getLead } from "@/server/services/lead-service";
import { StatusSelect } from "./status-select";
import { InteractionDialog } from "./interaction-dialog";
import { NoteForm } from "./note-form";
import { DeleteLeadButton } from "./delete-lead-button";

export const metadata: Metadata = { title: "Lead" };

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="k-label shrink-0 pt-0.5">{label}</span>
      <span className="text-right text-sm text-foam">{value || "—"}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const overdue = lead.nextActionAt && lead.nextActionAt < new Date();

  return (
    <div>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Leads
      </Link>

      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">
            {lead.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={LEAD_STATUS[lead.status].tone}>
              {LEAD_STATUS[lead.status].label}
            </Badge>
            <Badge tone={TEMPERATURE[lead.temperature].tone}>
              {TEMPERATURE[lead.temperature].label}
            </Badge>
            <span className="text-xs text-faint">
              {LEAD_SOURCE[lead.source].label}
              {lead.campaign ? ` · ${lead.campaign.name}` : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect leadId={lead.id} current={lead.status} />
          <InteractionDialog leadId={lead.id} />
          <ButtonLink href={`/leads/${lead.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </ButtonLink>
        </div>
      </div>

      {/* Acciones de contacto rápidas */}
      <div className="mb-6 flex flex-wrap gap-2">
        {lead.phone ? (
          <>
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam transition-colors hover:bg-raise"
            >
              <Phone className="h-3.5 w-3.5 text-lavender" />
              Llamar
            </a>
            <a
              href={waLink(lead.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam transition-colors hover:bg-raise"
            >
              <MessageCircle className="h-3.5 w-3.5 text-ok" />
              WhatsApp
            </a>
          </>
        ) : null}
        {lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam transition-colors hover:bg-raise"
          >
            <Mail className="h-3.5 w-3.5 text-lavender" />
            Email
          </a>
        ) : null}
        {lead.instagram ? (
          <a
            href={`https://instagram.com/${lead.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam transition-colors hover:bg-raise"
          >
            <AtSign className="h-3.5 w-3.5 text-lavender" />
            {lead.instagram}
          </a>
        ) : null}
        {lead.website ? (
          <a
            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam transition-colors hover:bg-raise"
          >
            <Globe className="h-3.5 w-3.5 text-lavender" />
            Web
          </a>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-5 lg:col-span-2">
          {/* Siguiente acción */}
          <Card className={overdue ? "border-danger/30" : lead.nextAction ? "border-violet-line" : ""}>
            <CardHeader>
              <CardTitle>Siguiente acción</CardTitle>
              {lead.nextActionAt ? (
                <span
                  className={
                    overdue
                      ? "text-xs font-bold text-danger"
                      : "text-xs font-semibold text-lavender"
                  }
                >
                  {relativeDays(lead.nextActionAt)} · {formatDateTime(lead.nextActionAt)}
                </span>
              ) : null}
            </CardHeader>
            <CardBody>
              {lead.nextAction ? (
                <p className="text-base font-semibold text-foam">{lead.nextAction}</p>
              ) : (
                <p className="text-sm text-faint">
                  Sin siguiente acción definida. Un lead sin siguiente acción es un lead
                  que se enfría.
                </p>
              )}
            </CardBody>
          </Card>

          {/* Diagnóstico */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico comercial</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="k-label mb-1">Dolor detectado</p>
                <p className="text-sm text-mist">
                  {lead.painDetected || "Sin registrar todavía."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="k-label mb-1">Servicio potencial</p>
                  <p className="text-sm text-mist">
                    {lead.service?.name || lead.potentialService || "—"}
                  </p>
                </div>
                <div>
                  <p className="k-label mb-1">Presupuesto estimado</p>
                  <p className="text-sm text-mist">
                    {formatMoney(lead.estimatedBudget?.toString())}
                  </p>
                </div>
              </div>
              {lead.objections ? (
                <div>
                  <p className="k-label mb-1">Objeciones</p>
                  <p className="text-sm text-mist">{lead.objections}</p>
                </div>
              ) : null}
              {lead.internalNotes ? (
                <div>
                  <p className="k-label mb-1">Notas internas</p>
                  <p className="whitespace-pre-wrap text-sm text-mist">
                    {lead.internalNotes}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* Oportunidades */}
          {lead.opportunities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {lead.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-foam">{opp.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-mist">
                        {formatMoney(opp.estimatedValue?.toString())}
                      </span>
                      <Badge tone={OPPORTUNITY_STAGE[opp.stage].tone}>
                        {OPPORTUNITY_STAGE[opp.stage].label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {/* Historial de interacciones */}
          <Card>
            <CardHeader>
              <CardTitle>Interacciones ({lead.interactions.length})</CardTitle>
              <InteractionDialog leadId={lead.id} />
            </CardHeader>
            <CardBody>
              {lead.interactions.length === 0 ? (
                <EmptyState
                  title="Sin interacciones registradas"
                  hint="Registra llamadas, WhatsApps y reuniones para no perder el hilo."
                  className="py-8"
                />
              ) : (
                <ol className="space-y-3">
                  {lead.interactions.map((it) => (
                    <li
                      key={it.id}
                      className="rounded-xl border border-line bg-ink/40 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {it.direction === "inbound" ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-ok" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-lavender" />
                          )}
                          <Badge tone={INTERACTION_CHANNEL[it.channel].tone}>
                            {INTERACTION_CHANNEL[it.channel].label}
                          </Badge>
                        </div>
                        <span className="text-xs text-faint">
                          {formatDateTime(it.occurredAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foam">{it.summary}</p>
                      {it.detail ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-mist">
                          {it.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas ({lead.notes.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <NoteForm leadId={lead.id} />
              {lead.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-line bg-ink/40 px-4 py-3"
                >
                  {note.title ? (
                    <p className="mb-1 text-sm font-semibold text-foam">{note.title}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-mist">{note.content}</p>
                  <p className="mt-2 text-xs text-faint">{formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-line">
              <InfoRow label="Contacto" value={lead.contact} />
              <InfoRow label="Cargo" value={lead.role} />
              <InfoRow label="Teléfono" value={lead.phone} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Ciudad" value={[lead.city, lead.province].filter(Boolean).join(", ")} />
              <InfoRow label="Sector" value={lead.sector} />
              <InfoRow
                label="Probabilidad"
                value={lead.probability != null ? `${lead.probability}%` : null}
              />
              <InfoRow label="Primer contacto" value={formatDate(lead.firstContactAt)} />
              <InfoRow label="Último contacto" value={formatDate(lead.lastContactAt)} />
              <InfoRow label="Creado" value={formatDate(lead.createdAt)} />
              {lead.lostReason ? (
                <InfoRow label="Motivo pérdida" value={lead.lostReason} />
              ) : null}
              {lead.client ? (
                <InfoRow
                  label="Cliente"
                  value={
                    <Link href={`/clients/${lead.client.id}`} className="text-lavender">
                      {lead.client.name}
                    </Link>
                  }
                />
              ) : null}
            </CardBody>
          </Card>

          {(lead.utmSource || lead.utmCampaign || lead.metaLeadId) && (
            <Card>
              <CardHeader>
                <CardTitle>Atribución</CardTitle>
              </CardHeader>
              <CardBody className="divide-y divide-line">
                <InfoRow label="UTM source" value={lead.utmSource} />
                <InfoRow label="UTM medium" value={lead.utmMedium} />
                <InfoRow label="UTM campaign" value={lead.utmCampaign} />
                <InfoRow label="UTM content" value={lead.utmContent} />
                <InfoRow label="Meta lead ID" value={lead.metaLeadId} />
              </CardBody>
            </Card>
          )}

          <div className="flex justify-end">
            <DeleteLeadButton leadId={lead.id} leadName={lead.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
