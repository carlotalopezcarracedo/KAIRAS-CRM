import PDFDocument from "pdfkit";

/**
 * Generador de PDF tabular simple para informes (extracto de horas). PDFKit
 * no trae tablas: se dibujan a mano con anchos de columna fijos y salto de
 * página cuando no cabe una fila más. Suficiente para un informe de
 * cliente/proyecto/fecha; no pretende ser un motor de maquetación genérico.
 */

export type PdfTableSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  /** Proporciones relativas de cada columna; si se omite, reparto igual. */
  columnWeights?: number[];
};

export type PdfKeyValueSection = {
  title: string;
  pairs: { label: string; value: string }[];
};

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 22;

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number)[][],
  columnWeights?: number[],
) {
  const usableWidth = doc.page.width - PAGE_MARGIN * 2;
  const weights = columnWeights ?? headers.map(() => 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const colWidths = weights.map((w) => (w / totalWeight) * usableWidth);

  function ensureSpace(height: number) {
    if (doc.y + height > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
    }
  }

  function drawRow(cells: (string | number)[], opts: { bold?: boolean; height: number }) {
    ensureSpace(opts.height);
    const y = doc.y;
    let x = PAGE_MARGIN;
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
    cells.forEach((cell, i) => {
      doc.text(String(cell), x + 2, y + 4, { width: colWidths[i]! - 4, height: opts.height, ellipsis: true });
      x += colWidths[i]!;
    });
    doc
      .moveTo(PAGE_MARGIN, y + opts.height)
      .lineTo(PAGE_MARGIN + usableWidth, y + opts.height)
      .strokeColor("#dddddd")
      .lineWidth(0.5)
      .stroke();
    doc.y = y + opts.height;
  }

  drawRow(headers, { bold: true, height: HEADER_HEIGHT });
  if (rows.length === 0) {
    ensureSpace(ROW_HEIGHT);
    doc.font("Helvetica").fontSize(8.5).fillColor("#888888");
    doc.text("Sin datos para estos filtros.", PAGE_MARGIN, doc.y + 4);
    doc.fillColor("#000000");
    doc.y += ROW_HEIGHT;
    return;
  }
  for (const row of rows) {
    drawRow(row, { height: ROW_HEIGHT });
  }
}

function drawKeyValues(doc: PDFKit.PDFDocument, section: PdfKeyValueSection) {
  doc.font("Helvetica-Bold").fontSize(11).text(section.title);
  doc.moveDown(0.4);
  for (const { label, value } of section.pairs) {
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .text(`${label}:`, PAGE_MARGIN, doc.y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .text(` ${value}`);
  }
  doc.moveDown(0.8);
}

export async function buildPdfReport(opts: {
  title: string;
  subtitleLines?: string[];
  keyValueSection?: PdfKeyValueSection;
  tableSections: PdfTableSection[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(16).text(opts.title);
    if (opts.subtitleLines?.length) {
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(9.5).fillColor("#555555");
      for (const line of opts.subtitleLines) doc.text(line);
      doc.fillColor("#000000");
    }
    doc.moveDown(1);

    if (opts.keyValueSection) {
      drawKeyValues(doc, opts.keyValueSection);
    }

    for (const section of opts.tableSections) {
      if (doc.y > doc.page.height - PAGE_MARGIN - HEADER_HEIGHT - ROW_HEIGHT) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text(section.title);
      doc.moveDown(0.4);
      drawTable(doc, section.headers, section.rows, section.columnWeights);
      doc.moveDown(1);
    }

    doc.end();
  });
}
