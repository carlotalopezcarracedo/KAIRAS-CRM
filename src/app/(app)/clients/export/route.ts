import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listClients } from "@/server/services/client-service";
import { audit } from "@/server/audit/audit";
import { csvResponse, csvDate, todayStamp } from "@/lib/csv";
import { CLIENT_STATUS } from "@/lib/labels";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const clients = await listClients();
  const headers = [
    "Cliente",
    "Estado",
    "MRR (€)",
    "Proyectos activos",
    "CIF/NIF",
    "Email facturación",
    "Teléfono",
    "Ciudad",
    "Provincia",
    "Alta",
  ];
  const rows = clients.map((c) => [
    c.name,
    CLIENT_STATUS[c.status].label,
    c.mrr > 0 ? c.mrr.toFixed(2) : "",
    c.activeProjectsCount,
    c.vatId ?? "",
    c.billingEmail ?? "",
    c.phone ?? "",
    c.city ?? "",
    c.province ?? "",
    csvDate(c.createdAt),
  ]);

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "Client",
    metadata: { count: clients.length },
  });
  return csvResponse(`kairas-clientes-${todayStamp()}.csv`, headers, rows);
}
