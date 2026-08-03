import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatMoney } from "@/lib/utils";
import { prisma } from "@/server/db/prisma";
import { getApprovedHoursForClient } from "@/server/services/invoice-service";
import { ManualDraftForm, FromHoursForm } from "./forms";

export const metadata: Metadata = { title: "Nueva solicitud de factura" };

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const clientId = typeof raw.clientId === "string" ? raw.clientId : "";

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const hours = clientId ? await getApprovedHoursForClient(clientId) : null;

  return (
    <div>
      <Link
        href="/finance"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Finanzas
      </Link>
      <PageHeader
        title="Nueva solicitud de factura"
        subtitle="Entra en la cola para emitirse en Odoo. Aquí no se emite nada legal."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Concepto manual</CardTitle>
          </CardHeader>
          <CardBody>
            <ManualDraftForm clients={clients} defaultClientId={clientId} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Desde horas aprobadas</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <FromHoursForm clients={clients} defaultClientId={clientId} />
            {clientId && hours ? (
              hours.entries.length === 0 ? (
                <p className="rounded-xl border border-line bg-ink/40 px-4 py-3 text-sm text-faint">
                  Este cliente no tiene horas <strong>aprobadas</strong> sin
                  facturar. Marca entradas como «Aprobada» en Tiempo para poder
                  agruparlas aquí.
                </p>
              ) : (
                <div className="rounded-xl border border-violet-line bg-violet-soft/40 px-4 py-3">
                  <p className="k-label mb-2">Se agruparían</p>
                  {hours.groups.map((g) => (
                    <p key={g.name} className="flex justify-between text-sm text-mist">
                      <span>{g.name}</span>
                      <span>
                        {formatDuration(g.seconds)} · {formatMoney(g.amount)}
                      </span>
                    </p>
                  ))}
                  <p className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-bold text-foam">
                    <span>Total ({hours.entries.length} entradas)</span>
                    <span>
                      {formatDuration(hours.totalSeconds)} ·{" "}
                      {formatMoney(hours.totalAmount)}
                    </span>
                  </p>
                </div>
              )
            ) : (
              <p className="text-xs text-faint">
                Selecciona un cliente y pulsa «Ver horas» para previsualizar lo que
                se agruparía.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
