import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listEntries } from "@/server/services/time-service";
import { WORK_TYPE, TIME_ENTRY_STATUS } from "@/lib/labels";

function csvEscape(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const from = new Date(params.get("from") ?? "");
  const to = new Date(params.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Rango de fechas no válido" }, { status: 400 });
  }

  const entries = await listEntries(user.id, { from, to });

  const header = [
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

  const rows = entries.map((e) => [
    e.startedAt.toISOString().slice(0, 10),
    e.startedAt.toISOString().slice(11, 16),
    e.endedAt ? e.endedAt.toISOString().slice(11, 16) : "",
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

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(";"))
    .join("\r\n");

  const fileName = `kairas-tiempo-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;

  // BOM para que Excel abra bien los acentos
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
