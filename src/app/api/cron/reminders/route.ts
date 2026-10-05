/**
 * Cron de recordatorios. Disparado por un GitHub Action programado
 * (.github/workflows/reminders-cron.yml) cada 15 min, no por Vercel Cron: en
 * el plan Hobby, Vercel Cron solo admite una ejecución al día. Revisa tareas
 * con `remindAt` vencido y leads con seguimiento (`nextActionAt`) vencido, y
 * manda un push a todas las suscripciones activas. `remindedAt` evita
 * reenviar el mismo aviso en la siguiente pasada. Respeta las preferencias
 * de Ajustes → Notificaciones: el interruptor general y la antelación
 * (`reminderLeadMinutes`) con la que avisar antes de la hora exacta.
 */
import { NextResponse } from "next/server";
import type { LeadStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastPush } from "@/server/services/push-service";
import { getNotificationDefaults } from "@/server/services/settings-service";

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

  const prefs = await getNotificationDefaults();
  if (!prefs.enabled) {
    return NextResponse.json({ ok: true, skipped: "notifications_disabled" });
  }

  const now = new Date();
  // "Avisar con antelación": el aviso dispara cuando falten <= X minutos
  // para remindAt/nextActionAt, no solo cuando ya haya pasado.
  const threshold = new Date(now.getTime() + prefs.reminderLeadMinutes * 60_000);

  const [dueTasks, dueLeads] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        remindAt: { lte: threshold },
        remindedAt: null,
        status: { in: OPEN_TASK_STATUSES },
      },
      select: { id: true, title: true },
      take: 100,
    }),
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        nextActionAt: { lte: threshold },
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
