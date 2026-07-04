import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import {
  getMetaConfig,
  META_EVENT_MAPPING,
} from "@/integrations/meta/conversions-api";
import { ProcessQueueButton } from "./process-queue-button";

export const metadata: Metadata = { title: "Meta CAPI" };

const statusTone = {
  pending: "warn",
  sent: "ok",
  failed: "danger",
  skipped_no_consent: "neutral",
  test: "info",
} as const;

const statusLabel = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
  skipped_no_consent: "Sin consentimiento",
  test: "Test",
} as const;

const internalEventLabel: Record<string, string> = {
  lead_created: "Lead creado",
  lead_contacted: "Lead contactado",
  meeting_scheduled: "Reunión agendada",
  diagnosis_done: "Diagnóstico hecho",
  proposal_sent: "Propuesta enviada",
  qualified_lead: "Lead cualificado",
  deal_won: "Venta ganada",
  invoice_paid: "Factura cobrada",
  recurring_client_started: "Recurrente iniciado",
};

export default async function MetaPage() {
  const config = getMetaConfig();
  const [events, counts] = await Promise.all([
    prisma.metaEventLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { lead: { select: { id: true, name: true } } },
    }),
    prisma.metaEventLog.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));

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
        title="Meta Conversions API"
        subtitle="Los eventos se registran siempre; solo se envían con credenciales y consentimiento."
        actions={<ProcessQueueButton disabled={!config.configured} />}
      />

      {!config.configured ? (
        <div className="mb-5 rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          Módulo en modo registro: sin <code>META_PIXEL_ID</code> y{" "}
          <code>META_ACCESS_TOKEN</code> en <code>.env</code> no se envía nada a
          Meta. Los eventos se acumulan en la cola para cuando lo actives.
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pendientes" value={countMap.get("pending") ?? 0} />
        <StatCard
          label="Enviados"
          value={(countMap.get("sent") ?? 0) + (countMap.get("test") ?? 0)}
          hint={config.testEventCode ? "incluye modo test" : undefined}
        />
        <StatCard
          label="Fallidos"
          value={countMap.get("failed") ?? 0}
          accent={(countMap.get("failed") ?? 0) > 0}
        />
        <StatCard
          label="Sin consentimiento"
          value={countMap.get("skipped_no_consent") ?? 0}
          hint="no se envían nunca"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cola de eventos ({events.length} recientes)</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-faint">
                  Aún no hay eventos. Se registran automáticamente al crear leads,
                  agendar reuniones, enviar propuestas, ganar ventas y cobrar
                  facturas.
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foam">
                        {internalEventLabel[event.internalEvent] ?? event.internalEvent}
                        <span className="ml-2 text-xs text-faint">
                          → {event.metaEventName}
                        </span>
                      </p>
                      <p className="truncate text-xs text-faint">
                        {event.lead ? (
                          <Link
                            href={`/leads/${event.lead.id}`}
                            className="hover:text-lavender"
                          >
                            {event.lead.name}
                          </Link>
                        ) : (
                          "Sin lead"
                        )}
                        {" · "}
                        {formatDateTime(event.createdAt)}
                        {event.eventValue
                          ? ` · ${Number(event.eventValue)} ${event.currency ?? "EUR"}`
                          : ""}
                        {event.attempts > 0 ? ` · ${event.attempts} intentos` : ""}
                      </p>
                      {event.lastError ? (
                        <p className="mt-0.5 text-xs text-danger">{event.lastError}</p>
                      ) : null}
                    </div>
                    <Badge tone={statusTone[event.status]}>
                      {statusLabel[event.status]}
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
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-mist">Estado</span>
                <Badge tone={config.configured ? "ok" : "neutral"}>
                  {config.configured ? "Activa" : "Solo registro"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Pixel ID</span>
                <span className="font-mono text-xs text-faint">
                  {config.pixelId
                    ? `…${config.pixelId.slice(-4)}`
                    : "no definido"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Versión API</span>
                <span className="font-mono text-xs text-faint">{config.apiVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Modo test</span>
                <Badge tone={config.testEventCode ? "warn" : "neutral"}>
                  {config.testEventCode ? "Sí" : "No"}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapeo de eventos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5">
              {Object.entries(META_EVENT_MAPPING).map(([internal, mapping]) => (
                <div
                  key={internal}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-mist">
                    {internalEventLabel[internal] ?? internal}
                  </span>
                  <span className="font-mono text-faint">
                    {mapping.metaName}
                    {mapping.custom ? " (custom)" : ""}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacidad</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs text-faint">
              <p>
                Email y teléfono se envían <strong className="text-mist">solo</strong>{" "}
                hasheados (SHA-256) y solo si el lead tiene consentimiento o
                interés legítimo registrado.
              </p>
              <p>
                Los leads marcados «No contactar» o sin base legal quedan como
                «Sin consentimiento» y nunca salen de KAIRAS OS.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
