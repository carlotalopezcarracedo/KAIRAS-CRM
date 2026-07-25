import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { listProjects } from "@/server/services/project-service";
import { PROJECT_STATUSES } from "@/server/validators/project";
import { audit } from "@/server/audit/audit";
import { csvResponse, csvDate, todayStamp } from "@/lib/csv";
import { PROJECT_STATUS, PROJECT_BILLING, PRIORITY } from "@/lib/labels";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && (PROJECT_STATUSES as readonly string[]).includes(statusParam)
      ? statusParam
      : undefined;
  const projects = await listProjects({ status });

  const headers = [
    "Proyecto",
    "Cliente",
    "Servicio",
    "Estado",
    "Prioridad",
    "Modo de cobro",
    "Presupuesto (€)",
    "Horas (h)",
    "Tareas abiertas",
    "Tareas totales",
    "Inicio",
    "Deadline",
  ];
  const rows = projects.map((p) => [
    p.name,
    p.client.name,
    p.mainService?.name ?? "",
    PROJECT_STATUS[p.status].label,
    PRIORITY[p.priority].label,
    PROJECT_BILLING[p.billingMode].label,
    p.budget ? Number(p.budget).toFixed(2) : "",
    (p.totalSeconds / 3600).toFixed(2),
    p.openTasks,
    p.totalTasks,
    csvDate(p.startAt),
    csvDate(p.deadline),
  ]);

  await audit({
    actorId: user.id,
    action: "export",
    entityType: "Project",
    metadata: { count: projects.length, status },
  });
  return csvResponse(`kairas-proyectos-${todayStamp()}.csv`, headers, rows);
}
