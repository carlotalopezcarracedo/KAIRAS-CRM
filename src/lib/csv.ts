import { NextResponse } from "next/server";

/** Escapa un valor para CSV con separador `;` (Excel ES lo abre directo). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[";\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Construye una respuesta CSV descargable. Incluye BOM para que Excel abra
 * bien los acentos y usa `;` como separador (estándar en España).
 */
export function csvResponse(
  fileName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): NextResponse {
  const body = [headers, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");
  return new NextResponse("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const madridDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha YYYY-MM-DD en Madrid para celdas de CSV. */
export function csvDate(date: Date | null | undefined): string {
  if (!date) return "";
  return madridDate.format(date);
}

/** Sufijo de fecha para nombres de archivo. */
export function todayStamp(): string {
  return madridDate.format(new Date());
}
