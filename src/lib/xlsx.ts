import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

export type XlsxSheet = {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

/** Construye una respuesta .xlsx descargable con una o varias hojas. */
export function xlsxResponse(fileName: string, sheets: XlsxSheet[]): NextResponse {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      sheet.headers,
      ...sheet.rows.map((row) => row.map((cell) => cell ?? "")),
    ]);
    // Nombre de hoja de Excel: máx 31 caracteres, sin : \ / ? * [ ]
    const safeName = sheet.name.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Hoja1";
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
