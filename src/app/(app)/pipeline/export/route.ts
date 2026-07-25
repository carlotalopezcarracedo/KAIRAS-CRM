import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listOpportunities } from "@/server/services/opportunity-service";
import { audit } from "@/server/audit/audit";
import { csvResponse, csvDate, todayStamp } from "@/lib/csv";
import { OPPORTUNITY_STAGE, PRIORITY } from "@/lib/labels";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const includeClosed = request.nextUrl.searchParams.get("all") === "1";
  const opportunities = await listOpportunities({ includeClosed });

  const headers = [
    "Oportunidad",
    "Lead / Cliente",
    "Servicio",
    "Etapa",
    "Prioridad",
    "Valor estimado (€)",
    "Probabilidad (%)",
    "Valor ponderado (€)",
    "Valor aceptado (€)",
    "Cierre previsto",
    "Siguiente acción",
  ];
  const rows = opportunities.map((o) => {
    const value = o.estimatedValue ? Number(o.estimatedValue) : 0;
    return [
      o.title,
      o.client?.name ?? o.lead?.name ?? "",
      o.service?.name ?? "",
      OPPORTUNITY_STAGE[o.stage].label,
      PRIORITY[o.priority].label,
      value ? value.toFixed(2) : "",
      o.probability,
      ((value * o.probability) / 100).toFixed(2),
      o.acceptedValue ? Number(o.acceptedValue).toFixed(2) : "",
      csvDate(o.expectedCloseAt),
      o.nextAction ?? "",
    ];
  });

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "Opportunity",
    metadata: { count: opportunities.length, includeClosed },
  });
  return csvResponse(`kairas-pipeline-${todayStamp()}.csv`, headers, rows);
}
