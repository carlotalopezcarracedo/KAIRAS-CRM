import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type DraftLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

/**
 * Exporta las solicitudes pendientes/en cola como CSV importable en Odoo
 * (facturas borrador). Formato de import de account.move con líneas.
 * Marca las solicitudes exportadas como "queued" y registra el OdooSyncJob.
 */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const drafts = await prisma.invoiceDraftRequest.findMany({
    where: { deletedAt: null, status: { in: ["pending", "queued"] } },
    include: { client: { select: { name: true, vatId: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (drafts.length === 0) {
    return NextResponse.json(
      { error: "No hay solicitudes pendientes que exportar." },
      { status: 404 },
    );
  }

  // Formato import Odoo (account.move): la primera línea de cada factura lleva
  // los datos de cabecera; las siguientes solo las líneas.
  const header = [
    "partner_id",
    "ref",
    "invoice_line_ids/name",
    "invoice_line_ids/quantity",
    "invoice_line_ids/price_unit",
    "invoice_line_ids/tax_ids",
  ];

  const rows: string[][] = [];
  for (const draft of drafts) {
    const lines: DraftLine[] = Array.isArray(draft.lines)
      ? (draft.lines as DraftLine[])
      : [
          {
            description: draft.concept,
            quantity: 1,
            unitPrice: Number(draft.amountNet ?? 0),
            vatRate: 21,
          },
        ];
    lines.forEach((line, index) => {
      rows.push([
        index === 0 ? (draft.client?.name ?? "") : "",
        index === 0 ? `KAIRAS-${draft.id.slice(-8)}` : "",
        line.description,
        String(line.quantity),
        String(line.unitPrice),
        line.vatRate ? `IVA ${line.vatRate}%` : "",
      ]);
    });
  }

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\r\n");

  // Marca como en cola y registra el job
  await prisma.invoiceDraftRequest.updateMany({
    where: { id: { in: drafts.map((d) => d.id) }, status: "pending" },
    data: { status: "queued" },
  });

  const job = await prisma.odooSyncJob.create({
    data: {
      type: "invoices_export",
      mode: "csv",
      status: "success",
      itemsTotal: drafts.length,
      itemsOk: drafts.length,
      itemsError: 0,
      fileName: `kairas-odoo-facturas-${new Date().toISOString().slice(0, 10)}.csv`,
      startedAt: new Date(),
      finishedAt: new Date(),
      result: { draftIds: drafts.map((d) => d.id) },
    },
  });

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "OdooSyncJob",
    entityId: job.id,
    metadata: { drafts: drafts.length },
  });

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${job.fileName}"`,
    },
  });
}
