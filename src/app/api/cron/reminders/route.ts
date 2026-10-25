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
import { broadcastPush, isPushConfigured } from "@/server/services/push-service";
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
  // Si un aviso no pudo entregarse (sin dispositivos suscritos o fallo del
  // servicio push) se reintenta en la siguiente pasada, pero solo durante 24 h
  // para no soltar avisos viejísimos al activar las notificaciones.
  const oldest = new Date(now.getTime() - 24 * 60 * 60_000);

  const [dueTasks, dueLeads] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        remindAt: { lte: threshold, gte: oldest },
        remindedAt: null,
        status: { in: OPEN_TASK_STATUSES },
      },
      select: { id: true, title: true },
      take: 100,
    }),
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        nextActionAt: { lte: threshold, gte: oldest },
        remindedAt: null,
        status: { notIn: CLOSED_LEAD_STATUSES },
      },
      select: { id: true, name: true, nextAction: true },
      take: 100,
    }),
  ]);

  const [taskResults, leadResults] = await Promise.all([
    Promise.all(
      dueTasks.map(async (task) => ({
        id: task.id,
        result: await broadcastPush({
          title: "Recordatorio de tarea",
          body: task.title,
          url: `/tasks/${task.id}`,
          tag: `task-${task.id}`,
        }),
      })),
    ),
    Promise.all(
      dueLeads.map(async (lead) => ({
        id: lead.id,
        result: await broadcastPush({
          title: "Seguimiento pendiente",
          body: lead.nextAction ? `${lead.name}: ${lead.nextAction}` : lead.name,
          url: `/leads/${lead.id}`,
          tag: `lead-${lead.id}`,
        }),
      })),
    ),
  ]);

  // Solo se marcan como avisados los que llegaron a algún dispositivo.
  const deliveredTasks = taskResults.filter((r) => r.result.sent > 0).map((r) => r.id);
  const deliveredLeads = leadResults.filter((r) => r.result.sent > 0).map((r) => r.id);

  await Promise.all([
    deliveredTasks.length
      ? prisma.task.updateMany({
          where: { id: { in: deliveredTasks } },
          data: { remindedAt: now },
        })
      : Promise.resolve(),
    deliveredLeads.length
      ? prisma.lead.updateMany({
          where: { id: { in: deliveredLeads } },
          data: { remindedAt: now },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ok: true,
    pushConfigured: isPushConfigured(),
    due: { tasks: dueTasks.length, leads: dueLeads.length },
    tasksNotified: deliveredTasks.length,
    leadsNotified: deliveredLeads.length,
  });
}
