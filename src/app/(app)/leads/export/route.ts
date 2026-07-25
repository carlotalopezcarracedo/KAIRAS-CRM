import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listLeads } from "@/server/services/lead-service";
import { leadFiltersSchema } from "@/server/validators/lead";
import { audit } from "@/server/audit/audit";
import { csvResponse, csvDate, todayStamp } from "@/lib/csv";
import { LEAD_STATUS, LEAD_SOURCE, TEMPERATURE } from "@/lib/labels";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const p = request.nextUrl.searchParams;
  const filters = leadFiltersSchema.parse({
    q: p.get("q") ?? "",
    status: p.get("status") ?? undefined,
    temperature: p.get("temperature") ?? undefined,
    source: p.get("source") ?? undefined,
  });
  const leads = await listLeads(filters);

  const headers = [
    "Nombre",
    "Contacto",
    "Estado",
    "Temperatura",
    "Fuente",
    "Teléfono",
    "Email",
    "Ciudad",
    "Sector",
    "Servicio potencial",
    "Presupuesto (€)",
    "Probabilidad (%)",
    "Siguiente acción",
    "Fecha siguiente acción",
    "Último contacto",
    "Creado",
  ];
  const rows = leads.map((l) => [
    l.name,
    l.contact ?? "",
    LEAD_STATUS[l.status].label,
    TEMPERATURE[l.temperature].label,
    LEAD_SOURCE[l.source].label,
    l.phone ?? "",
    l.email ?? "",
    l.city ?? "",
    l.sector ?? "",
    l.service?.name ?? l.potentialService ?? "",
    l.estimatedBudget ? Number(l.estimatedBudget).toFixed(2) : "",
    l.probability ?? "",
    l.nextAction ?? "",
    csvDate(l.nextActionAt),
    csvDate(l.lastContactAt),
    csvDate(l.createdAt),
  ]);

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "Lead",
    metadata: { count: leads.length, filters },
  });
  return csvResponse(`kairas-leads-${todayStamp()}.csv`, headers, rows);
}
