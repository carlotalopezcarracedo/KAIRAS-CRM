/**
 * Cron de recordatorios. Disparado por un GitHub Action programado
 * (.github/workflows/reminders-cron.yml) cada 15 min, no por Vercel Cron: en
 * el plan Hobby, Vercel Cron solo admite una ejecución al día. Revisa tareas
 * con `remindAt` vencido y leads con seguimiento (`nextActionAt`) vencido, y
 * manda un push a todas las suscripciones activas. `remindedAt` evita
 * reenviar el mismo aviso en la siguiente pasada.
 */
import { NextResponse } from "next/server";
import type { LeadStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastPush } from "@/server/services/push-service";

export const dynamic = "force-dynamic";

const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "waiting"];
const CLOSED_LEAD_STATUSES: LeadStatus[] = ["won", "lost", "do_not_contact"];

function unauthorized() {
  return NextResponse.json({ error: "No autorizada" }, { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return unauthorized();
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  const now = new Date();

  const [dueTasks, dueLeads] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        remindAt: { lte: now },
        remindedAt: null,
        status: { in: OPEN_TASK_STATUSES },
      },
      select: { id: true, title: true },
      take: 100,
    }),
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        nextActionAt: { lte: now },
        remindedAt: null,
        status: { notIn: CLOSED_LEAD_STATUSES },
      },
      select: { id: true, name: true, nextAction: true },
      take: 100,
    }),
  ]);

  await Promise.all([
    ...dueTasks.map((task) =>
      broadcastPush({
        title: "Recordatorio de tarea",
        body: task.title,
        url: `/tasks/${task.id}`,
        tag: `task-${task.id}`,
      }),
    ),
    ...dueLeads.map((lead) =>
      broadcastPush({
        title: "Seguimiento pendiente",
        body: lead.nextAction ? `${lead.name}: ${lead.nextAction}` : lead.name,
        url: `/leads/${lead.id}`,
        tag: `lead-${lead.id}`,
      }),
    ),
  ]);

  await Promise.all([
    dueTasks.length
      ? prisma.task.updateMany({
          where: { id: { in: dueTasks.map((t) => t.id) } },
          data: { remindedAt: now },
        })
      : Promise.resolve(),
    dueLeads.length
      ? prisma.lead.updateMany({
          where: { id: { in: dueLeads.map((l) => l.id) } },
          data: { remindedAt: now },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ok: true,
    tasksNotified: dueTasks.length,
    leadsNotified: dueLeads.length,
  });
}
