import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ArrowLeft, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { DateTimeField } from "@/components/ui/date-time-field";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { toDateOnlyInput, startOfMonthMadrid } from "@/lib/dates";

export const metadata: Metadata = { title: "Exportar horas" };

export default async function TimeExportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const raw = await searchParams;
  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");

  const list = (key: string) =>
    typeof raw[key] === "string" ? [raw[key] as string] : Array.isArray(raw[key]) ? (raw[key] as string[]) : [];

  const defaultFrom = str("from") || toDateOnlyInput(startOfMonthMadrid(0));
  const defaultTo = str("to") || toDateOnlyInput(new Date());
  const defaultClientIds = list("clientId");
  const defaultProjectIds = list("projectId");
  const defaultBillable = str("billable");

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <Link
        href="/time"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-foam"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tiempo
      </Link>
      <PageHeader
        title="Exportar horas"
        subtitle="Filtra el periodo, elige el nivel de detalle y descarga en el formato que necesites."
      />

      <form action="/time/export/download" method="get" className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Desde" required>
                  <DateTimeField withTime={false} name="from" defaultValue={defaultFrom} required />
                </Field>
                <Field label="Hasta" required>
                  <DateTimeField withTime={false} name="to" defaultValue={defaultTo} required />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Clientes">
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line bg-ink/40 p-2">
                    {clients.length === 0 ? (
                      <p className="px-1.5 py-1 text-xs text-faint">No hay clientes.</p>
                    ) : (
                      clients.map((c) => (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-mist hover:bg-raise has-[:checked]:text-foam"
                        >
                          <input
                            type="checkbox"
                            name="clientId"
                            value={c.id}
                            defaultChecked={defaultClientIds.includes(c.id)}
                          />
                          {c.name}
                        </label>
                      ))
                    )}
                  </div>
                  <span className="block text-xs text-faint">
                    Sin marcar ninguno = todos los clientes.
                  </span>
                </Field>
                <Field label="Proyectos">
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line bg-ink/40 p-2">
                    {projects.length === 0 ? (
                      <p className="px-1.5 py-1 text-xs text-faint">No hay proyectos.</p>
                    ) : (
                      projects.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-mist hover:bg-raise has-[:checked]:text-foam"
                        >
                          <input
                            type="checkbox"
                            name="projectId"
                            value={p.id}
                            defaultChecked={defaultProjectIds.includes(p.id)}
                          />
                          {p.name}
                        </label>
                      ))
                    )}
                  </div>
                  <span className="block text-xs text-faint">
                    Sin marcar ninguno = todos los proyectos.
                  </span>
                </Field>
              </div>
              <Field label="Facturable" className="sm:w-60">
                <Select name="billable" defaultValue={defaultBillable} aria-label="Facturable">
                  <option value="">Todas</option>
                  <option value="1">Solo facturable</option>
                  <option value="0">Solo no facturable</option>
                </Select>
              </Field>
              <p className="text-xs text-faint">
                Los filtros se combinan entre sí: periodo + clientes + proyectos +
                facturable se aplican todos a la vez. Puedes marcar varios
                clientes o proyectos a la vez.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nivel de detalle</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-ink/40 p-3 has-[:checked]:border-violet-line has-[:checked]:bg-violet-soft">
                <input type="radio" name="detail" value="detailed" defaultChecked className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foam">Detallado</span>
                  <span className="block text-xs text-faint">
                    Una fila por entrada de tiempo, con fecha, cliente, proyecto,
                    descripción, duración e importe.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-ink/40 p-3 has-[:checked]:border-violet-line has-[:checked]:bg-violet-soft">
                <input type="radio" name="detail" value="summary" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foam">
                    Solo el total (resumen)
                  </span>
                  <span className="block text-xs text-faint">
                    Totales del periodo y desgloses por cliente, proyecto y tipo de
                    trabajo, sin listar cada entrada.
                  </span>
                </span>
              </label>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Descargar</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <Button type="submit" name="format" value="xlsx" className="w-full justify-center">
                <FileSpreadsheet className="h-4 w-4" />
                Excel (.xlsx)
              </Button>
              <Button
                type="submit"
                name="format"
                value="csv"
                variant="secondary"
                className="w-full justify-center"
              >
                <FileDown className="h-4 w-4" />
                CSV
              </Button>
              <Button
                type="submit"
                name="format"
                value="pdf"
                variant="secondary"
                className="w-full justify-center"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <p className="pt-1 text-xs text-faint">
                La descarga usa el periodo, los filtros y el nivel de detalle de
                arriba.
              </p>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
