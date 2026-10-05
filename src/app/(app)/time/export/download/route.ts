import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit/audit";
import { prisma } from "@/server/db/prisma";
import { listEntriesForExport, getTimeSummary } from "@/server/services/time-service";
import { WORK_TYPE, TIME_ENTRY_STATUS } from "@/lib/labels";
import { csvResponse, csvDate } from "@/lib/csv";
import { xlsxResponse, type XlsxSheet } from "@/lib/xlsx";
import { buildPdfReport, type PdfTableSection } from "@/lib/pdf";
import { formatMoney } from "@/lib/utils";
import { parseMadridLocal } from "@/lib/dates";

const madridTime = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
});

type Detail = "detailed" | "summary";
type Format = "csv" | "xlsx" | "pdf";

const DETAILED_HEADERS = [
  "Fecha",
  "Inicio",
  "Fin",
  "Duración (h)",
  "Título",
  "Descripción",
  "Cliente",
  "Proyecto",
  "Tarea",
  "Servicio",
  "Tipo de trabajo",
  "Facturable",
  "Tarifa (€/h)",
  "Importe (€)",
  "Estado",
];

function detailedRows(entries: Awaited<ReturnType<typeof listEntriesForExport>>) {
  return entries.map((e) => [
    csvDate(e.startedAt),
    madridTime.format(e.startedAt),
    e.endedAt ? madridTime.format(e.endedAt) : "",
    (e.durationSeconds / 3600).toFixed(2),
    e.title ?? "",
    e.description ?? "",
    e.client?.name ?? "",
    e.project?.name ?? "",
    e.task?.title ?? "",
    e.service?.name ?? "",
    WORK_TYPE[e.workType].label,
    e.billable ? "Sí" : "No",
    e.hourlyRate ? Number(e.hourlyRate).toFixed(2) : "",
    e.calculatedAmount ? Number(e.calculatedAmount).toFixed(2) : "",
    TIME_ENTRY_STATUS[e.status].label,
  ]);
}

function hours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  // "YYYY-MM-DD" tal y como lo manda el formulario (hora de pared de
  // Madrid): "hasta" se extiende al final de ese día, igual que en el resto
  // de la app (ver importHistoricalAction en la integración Toggl).
  const fromRaw = params.get("from") ?? "";
  const toRaw = params.get("to") ?? "";
  const from = parseMadridLocal(fromRaw);
  const to = parseMadridLocal(toRaw ? `${toRaw}T23:59:59` : "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return NextResponse.json({ error: "Rango de fechas no válido" }, { status: 400 });
  }

  const detail: Detail = params.get("detail") === "summary" ? "summary" : "detailed";
  const formatParam = params.get("format");
  const format: Format = formatParam === "xlsx" || formatParam === "pdf" ? formatParam : "csv";

  const clientIds = params.getAll("clientId").filter(Boolean);
  const projectIds = params.getAll("projectId").filter(Boolean);
  const filters = {
    clientId: clientIds.length ? clientIds : undefined,
    projectId: projectIds.length ? projectIds : undefined,
    billable:
      params.get("billable") === "1" ? true : params.get("billable") === "0" ? false : undefined,
  };

  // Nombres de cliente/proyecto para el subtítulo del informe (solo lectura,
  // no cambia el filtrado): si se pidieron concretos, se resuelven sus nombres.
  const [clientNames, projectNames] = await Promise.all([
    filters.clientId
      ? prisma.client.findMany({ where: { id: { in: filters.clientId } }, select: { name: true } })
      : [],
    filters.projectId
      ? prisma.project.findMany({
          where: { id: { in: filters.projectId } },
          select: { name: true },
        })
      : [],
  ]);

  const periodLabel = `${csvDate(from)} – ${csvDate(to)}`;
  const filterLines = [
    `Periodo: ${periodLabel}`,
    `Cliente: ${clientNames.length ? clientNames.map((c) => c.name).join(", ") : "Todos"}`,
    `Proyecto: ${projectNames.length ? projectNames.map((p) => p.name).join(", ") : "Todos"}`,
    `Facturable: ${filters.billable === true ? "Solo facturable" : filters.billable === false ? "Solo no facturable" : "Todas"}`,
  ];

  const fileStamp = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
  const fileBase = `kairas-tiempo-${detail === "summary" ? "resumen" : "detalle"}-${fileStamp}`;

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "TimeEntry",
    metadata: { detail, format, from: from.toISOString(), to: to.toISOString(), ...filters },
  });

  if (detail === "detailed") {
    const entries = await listEntriesForExport(user.id, { from, to }, filters);
    const rows = detailedRows(entries);

    if (format === "xlsx") {
      const sheets: XlsxSheet[] = [{ name: "Entradas", headers: DETAILED_HEADERS, rows }];
      return xlsxResponse(`${fileBase}.xlsx`, sheets);
    }
    if (format === "pdf") {
      const pdf = await buildPdfReport({
        title: "Extracto de horas",
        subtitleLines: filterLines,
        tableSections: [
          {
            title: `Entradas (${entries.length})`,
            headers: ["Fecha", "Cliente", "Proyecto", "Título", "Horas", "Fact.", "Importe"],
            rows: rows.map((r) => [r[0]!, r[6]!, r[7]!, r[4]!, r[3]!, r[11]!, r[13]! || "—"]),
            columnWeights: [1.1, 1.4, 1.4, 2.2, 0.8, 0.6, 1],
          },
        ],
      });
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return csvResponse(`${fileBase}.csv`, DETAILED_HEADERS, rows);
  }

  // --- Resumen (solo totales, sin listar cada entrada) ---
  const summary = await getTimeSummary(user.id, { from, to }, filters);
  const byClientRows = summary.byClient.map((r) => [r.name, hours(r.seconds), r.amount.toFixed(2)]);
  const byProjectRows = summary.byProject.map((r) => [r.name, hours(r.seconds), r.amount.toFixed(2)]);
  const byWorkTypeRows = summary.byWorkType.map((r) => [
    WORK_TYPE[r.workType as keyof typeof WORK_TYPE]?.label ?? r.workType,
    hours(r.seconds),
  ]);

  const totalsPairs = [
    { label: "Periodo", value: periodLabel },
    { label: "Total horas", value: hours(summary.totalSeconds) },
    { label: "Facturable", value: hours(summary.billableSeconds) },
    { label: "No facturable", value: hours(summary.nonBillableSeconds) },
    { label: "Importe estimado", value: formatMoney(summary.billableAmount, { cents: true }) },
    { label: "Entradas", value: String(summary.entriesCount) },
  ];

  if (format === "xlsx") {
    const sheets: XlsxSheet[] = [
      {
        name: "Resumen",
        headers: ["Concepto", "Valor"],
        rows: totalsPairs.map((p) => [p.label, p.value]),
      },
      { name: "Por cliente", headers: ["Cliente", "Horas", "Importe (€)"], rows: byClientRows },
      { name: "Por proyecto", headers: ["Proyecto", "Horas", "Importe (€)"], rows: byProjectRows },
      { name: "Por tipo de trabajo", headers: ["Tipo de trabajo", "Horas"], rows: byWorkTypeRows },
    ];
    return xlsxResponse(`${fileBase}.xlsx`, sheets);
  }

  if (format === "pdf") {
    const tableSections: PdfTableSection[] = [
      { title: "Por cliente", headers: ["Cliente", "Horas", "Importe (€)"], rows: byClientRows },
      { title: "Por proyecto", headers: ["Proyecto", "Horas", "Importe (€)"], rows: byProjectRows },
      {
        title: "Por tipo de trabajo",
        headers: ["Tipo de trabajo", "Horas"],
        rows: byWorkTypeRows,
        columnWeights: [2, 1],
      },
    ];
    const pdf = await buildPdfReport({
      title: "Resumen de horas",
      subtitleLines: filterLines,
      keyValueSection: { title: "Totales", pairs: totalsPairs },
      tableSections,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // CSV: varias secciones separadas por una línea en blanco. `csvResponse`
  // junta [headers, ...rows]; aquí se le pasa la primera línea como
  // "headers" y el resto como filas para que no aparezca una línea vacía al
  // principio.
  const csvBody: (string | number)[][] = [
    ...totalsPairs.map((p) => [p.label, p.value]),
    [],
    ["POR CLIENTE"],
    ["Cliente", "Horas", "Importe (€)"],
    ...byClientRows,
    [],
    ["POR PROYECTO"],
    ["Proyecto", "Horas", "Importe (€)"],
    ...byProjectRows,
    [],
    ["POR TIPO DE TRABAJO"],
    ["Tipo de trabajo", "Horas"],
    ...byWorkTypeRows,
  ];
  return csvResponse(`${fileBase}.csv`, ["RESUMEN"], csvBody);
}
