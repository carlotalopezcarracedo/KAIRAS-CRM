import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Exporta los clientes como CSV importable en Odoo (res.partner). */
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  if (clients.length === 0) {
    return NextResponse.json({ error: "No hay clientes que exportar." }, { status: 404 });
  }

  const header = ["name", "vat", "email", "phone", "street", "city", "is_company"];
  const rows = clients.map((c) => [
    c.name,
    c.vatId ?? "",
    c.billingEmail ?? "",
    c.phone ?? "",
    c.address ?? "",
    c.city ?? "",
    "True",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\r\n");

  const job = await prisma.odooSyncJob.create({
    data: {
      type: "contacts_export",
      mode: "csv",
      status: "success",
      itemsTotal: clients.length,
      itemsOk: clients.length,
      itemsError: 0,
      fileName: `kairas-odoo-contactos-${new Date().toISOString().slice(0, 10)}.csv`,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "OdooSyncJob",
    entityId: job.id,
    metadata: { clients: clients.length },
  });

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${job.fileName}"`,
    },
  });
}
