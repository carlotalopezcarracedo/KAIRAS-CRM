import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Phone, Mail, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EntityNoteForm } from "@/components/entity-note-form";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import {
  CLIENT_STATUS,
  PROJECT_STATUS,
  RECURRING_STATUS,
  OPPORTUNITY_STAGE,
  INVOICE_STATUS,
  INVOICE_DRAFT_STATUS,
  LEAD_STATUS,
  INTERACTION_CHANNEL,
} from "@/lib/labels";
import { formatMoney, formatDate, formatDateTime, formatDuration } from "@/lib/utils";
import { getClientFull } from "@/server/services/client-service";
import { deleteClientAction, addClientNoteAction } from "../actions";
import { ContactDialog } from "./contact-dialog";

export const metadata: Metadata = { title: "Cliente" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="k-label shrink-0 pt-0.5">{label}</span>
      <span className="text-right text-sm text-foam">{value || "—"}</span>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClientFull(id);
  if (!data) notFound();
  const { client, mrr, invoicedTotal, pendingTotal, totalSeconds, billableSeconds } =
    data;

  return (
    <div>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foam">
            {client.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={CLIENT_STATUS[client.status].tone}>
              {CLIENT_STATUS[client.status].label}
            </Badge>
            {client.satisfaction != null ? (
              <span className="text-xs text-faint">
                Satisfacción {client.satisfaction}/5
              </span>
            ) : null}
            {client.vatId ? (
              <span className="text-xs text-faint">{client.vatId}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam hover:bg-raise"
            >
              <Phone className="h-3.5 w-3.5 text-lavender" />
              Llamar
            </a>
          ) : null}
          {client.billingEmail ? (
            <a
              href={`mailto:${client.billingEmail}`}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-foam hover:bg-raise"
            >
              <Mail className="h-3.5 w-3.5 text-lavender" />
              Email
            </a>
          ) : null}
          <ButtonLink href={`/projects/new?clientId=${client.id}`} variant="secondary" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Proyecto
          </ButtonLink>
          <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </ButtonLink>
        </div>
      </div>

      {/* KPIs del cliente */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR" value={formatMoney(mrr)} accent={mrr > 0} />
        <StatCard
          label="Cobrado"
          value={formatMoney(invoicedTotal)}
          hint={pendingTotal > 0 ? `${formatMoney(pendingTotal)} pendiente` : undefined}
        />
        <StatCard
          label="Horas registradas"
          value={formatDuration(totalSeconds)}
          hint={`${formatDuration(billableSeconds)} facturables`}
        />
        <StatCard
          label="Proyectos"
          value={client.projects.length}
          hint={`${client.projects.filter((p) => !["completed", "cancelled"].includes(p.status)).length} activos`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Proyectos */}
          <Card>
            <CardHeader>
              <CardTitle>Proyectos ({client.projects.length})</CardTitle>
              <ButtonLink
                href={`/projects/new?clientId=${client.id}`}
                variant="secondary"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </ButtonLink>
            </CardHeader>
            <CardBody className="space-y-2">
              {client.projects.length === 0 ? (
                <p className="text-sm text-faint">Sin proyectos todavía.</p>
              ) : (
                client.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5 hover:border-line-strong"
                  >
                    <div>
                      <span className="text-sm font-semibold text-foam">{p.name}</span>
                      <span className="block text-xs text-faint">
                        {p.mainService?.name ?? "—"}
                        {p.deadline ? ` · entrega ${formatDate(p.deadline)}` : ""}
                      </span>
                    </div>
                    <Badge tone={PROJECT_STATUS[p.status].tone}>
                      {PROJECT_STATUS[p.status].label}
                    </Badge>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          {/* Recurrentes */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios recurrentes ({client.recurringServices.length})</CardTitle>
              <ButtonLink
                href={`/recurring/new?clientId=${client.id}`}
                variant="secondary"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </ButtonLink>
            </CardHeader>
            <CardBody className="space-y-2">
              {client.recurringServices.length === 0 ? (
                <p className="text-sm text-faint">
                  Sin recurrentes. Aquí vivirán redes, mantenimientos y cuotas.
                </p>
              ) : (
                client.recurringServices.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                  >
                    <div>
                      <span className="text-sm font-semibold text-foam">
                        {r.title ?? r.service.name}
                      </span>
                      <span className="block text-xs text-faint">
                        {formatMoney(Number(r.amount))} ·{" "}
                        {r.periodicity === "monthly"
                          ? "mensual"
                          : r.periodicity === "quarterly"
                            ? "trimestral"
                            : r.periodicity === "yearly"
                              ? "anual"
                              : r.periodicity}
                        {r.nextInvoiceAt
                          ? ` · próximo ciclo ${formatDate(r.nextInvoiceAt)}`
                          : ""}
                      </span>
                    </div>
                    <Badge tone={RECURRING_STATUS[r.status].tone}>
                      {RECURRING_STATUS[r.status].label}
                    </Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Facturación */}
          <Card>
            <CardHeader>
              <CardTitle>Facturación</CardTitle>
              <ButtonLink
                href={`/finance/queue/new?clientId=${client.id}`}
                variant="secondary"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Solicitud de factura
              </ButtonLink>
            </CardHeader>
            <CardBody className="space-y-2">
              {client.invoiceDrafts.length === 0 && client.invoiceRecords.length === 0 ? (
                <p className="text-sm text-faint">
                  Sin facturas ni solicitudes. Las facturas legales viven en Odoo;
                  aquí verás la cola y los snapshots.
                </p>
              ) : (
                <>
                  {client.invoiceDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium text-foam">{d.concept}</span>
                        <span className="block text-xs text-faint">
                          Solicitud · {formatDate(d.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-mist">
                          {formatMoney(d.amountTotal?.toString())}
                        </span>
                        <Badge tone={INVOICE_DRAFT_STATUS[d.status].tone}>
                          {INVOICE_DRAFT_STATUS[d.status].label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {client.invoiceRecords.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                    >
                      <div>
                        <span className="text-sm font-medium text-foam">
                          {r.odooInvoiceNumber ?? r.concept ?? "Factura"}
                        </span>
                        <span className="block text-xs text-faint">
                          {r.issuedAt ? `Emitida ${formatDate(r.issuedAt)}` : "Sin emitir"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-mist">
                          {formatMoney(r.amountTotal?.toString())}
                        </span>
                        <Badge tone={INVOICE_STATUS[r.status].tone}>
                          {INVOICE_STATUS[r.status].label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardBody>
          </Card>

          {/* Oportunidades */}
          {client.opportunities.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {client.opportunities.map((o) => (
                  <Link
                    key={o.id}
                    href={`/pipeline/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5 hover:border-line-strong"
                  >
                    <span className="text-sm font-medium text-foam">{o.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-mist">
                        {formatMoney(o.estimatedValue?.toString())}
                      </span>
                      <Badge tone={OPPORTUNITY_STAGE[o.stage].tone}>
                        {OPPORTUNITY_STAGE[o.stage].label}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {/* Archivos */}
          <AttachmentsPanel
            entityType="client"
            entityId={client.id}
            revalidatePath={`/clients/${client.id}`}
          />

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas ({client.notesRel.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <EntityNoteForm action={addClientNoteAction.bind(null, client.id)} />
              {client.notesRel.map((note) => (
                <div key={note.id} className="rounded-xl border border-line bg-ink/40 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-mist">{note.content}</p>
                  <p className="mt-2 text-xs text-faint">{formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Interacciones */}
          {client.interactions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Interacciones</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {client.interactions.map((it) => (
                  <div key={it.id} className="rounded-xl border border-line bg-ink/40 px-4 py-3">
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

        {/* Lateral */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-line">
              <InfoRow label="Teléfono" value={client.phone} />
              <InfoRow label="Email fact." value={client.billingEmail} />
              <InfoRow label="CIF/NIF" value={client.vatId} />
              <InfoRow label="Dirección" value={client.address} />
              <InfoRow
                label="Ciudad"
                value={[client.city, client.province].filter(Boolean).join(", ")}
              />
              <InfoRow label="Odoo ID" value={client.odooPartnerId} />
              <InfoRow label="Cliente desde" value={formatDate(client.createdAt)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contactos ({client.contacts.length})</CardTitle>
              <ContactDialog clientId={client.id} />
            </CardHeader>
            <CardBody className="space-y-2">
              {client.contacts.length === 0 ? (
                <p className="text-sm text-faint">Sin contactos registrados.</p>
              ) : (
                client.contacts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line bg-ink/40 px-4 py-2.5">
                    <p className="text-sm font-semibold text-foam">
                      {p.firstName} {p.lastName ?? ""}
                      {p.role ? (
                        <span className="ml-1.5 text-xs font-normal text-faint">
                          {p.role}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-mist">
                      {[p.phone, p.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {client.leads.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Leads de origen</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {client.leads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5 hover:border-line-strong"
                  >
                    <span className="text-sm text-foam">{l.name}</span>
                    <Badge tone={LEAD_STATUS[l.status].tone}>
                      {LEAD_STATUS[l.status].label}
                    </Badge>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {client.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notas fijas</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-mist">{client.notes}</p>
              </CardBody>
            </Card>
          ) : null}

          <div className="flex justify-end">
            <ConfirmDelete
              action={deleteClientAction.bind(null, client.id)}
              title="Eliminar cliente"
              description={`"${client.name}" se archivará (borrado suave). Sus proyectos y facturas no se borran.`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
