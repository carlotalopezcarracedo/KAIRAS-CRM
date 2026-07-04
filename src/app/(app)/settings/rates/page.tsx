import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { listRates } from "@/server/services/rate-service";
import { RateForm } from "./rate-form";
import { ToggleRateButton } from "./toggle-rate-button";

export const metadata: Metadata = { title: "Tarifas" };

const scopeLabel: Record<string, string> = {
  global: "Global",
  client: "Cliente",
  project: "Proyecto",
  service: "Servicio",
};

export default async function RatesPage() {
  const [rates, clients, projects, services] = await Promise.all([
    listRates(),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, status: { notIn: ["completed", "cancelled"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Ajustes
      </Link>
      <PageHeader
        title="Tarifas horarias"
        subtitle="Prioridad al calcular: proyecto → cliente → servicio → global"
      />

      <div className="mb-6 rounded-card border border-line bg-surface p-4">
        <RateForm clients={clients} projects={projects} services={services} />
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Ámbito</TH>
            <TH>Aplica a</TH>
            <TH className="text-right">Tarifa</TH>
            <TH>Vigencia</TH>
            <TH>Estado</TH>
            <TH />
          </tr>
        </THead>
        <TBody>
          {rates.map((rate) => (
            <TR key={rate.id} className={!rate.active ? "opacity-50" : undefined}>
              <TD>
                <Badge tone={rate.scope === "global" ? "violet" : "neutral"}>
                  {scopeLabel[rate.scope]}
                </Badge>
              </TD>
              <TD className="text-mist">
                {rate.client?.name ??
                  rate.project?.name ??
                  rate.service?.name ??
                  "Toda la actividad"}
              </TD>
              <TD className="text-right font-semibold text-foam">
                {Number(rate.rate)} €/h
              </TD>
              <TD className="text-xs text-faint">
                {rate.validFrom ? `desde ${formatDate(rate.validFrom)}` : "sin límite"}
                {rate.validTo ? ` hasta ${formatDate(rate.validTo)}` : ""}
              </TD>
              <TD>
                <Badge tone={rate.active ? "ok" : "neutral"}>
                  {rate.active ? "Activa" : "Inactiva"}
                </Badge>
              </TD>
              <TD className="text-right">
                <ToggleRateButton rateId={rate.id} active={rate.active} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
