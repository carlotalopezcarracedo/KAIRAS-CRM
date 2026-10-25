/**
 * Cron de recordatorios. Disparado por un GitHub Action programado
 * (.github/workflows/reminders-cron.yml) cada 15 min, no por Vercel Cron: en
 * el plan Hobby, Vercel Cron solo admite una ejecución al día. Carga tareas y
 * leads abiertos, deja que `planReminders` decida qué toca avisar según
 * Ajustes → Notificaciones (varias antelaciones, filtros, modo silencio,
 * resumen diario) y manda un push a todas las suscripciones activas. Los
 * avisos entregados se anotan en `ReminderLog` para no repetirse.
 */
import { NextResponse } from "next/server";
import type { LeadStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastPush, isPushConfigured } from "@/server/services/push-service";
import { GRACE_MS, planReminders } from "@/server/services/reminder-planner";
import { getAppDefaults, getNotificationDefaults } from "@/server/services/settings-service";

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
  const appDefaults = await getAppDefaults();
  // Ventana de búsqueda: lo más lejano que puede estar un aviso por delante
  // (mayor antelación configurada) y 24 h hacia atrás (reintentos).
  const maxLead = Math.max(0, ...prefs.taskRemindOffsets, ...prefs.taskDueOffsets, ...prefs.leadFollowUpOffsets);
  const from = new Date(now.getTime() - GRACE_MS);
  const to = new Date(now.getTime() + (maxLead + 1) * 60_000 + 36 * 60 * 60_000);

  const [tasks, leads] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: OPEN_TASK_STATUSES },
        OR: [
          { remindAt: { gte: from, lte: to } },
          // Con resumen diario también cuentan las vencidas de cualquier fecha.
          { dueAt: prefs.summaryEnabled ? { lte: to } : { gte: from, lte: to } },
        ],
      },
      select: { id: true, title: true, priority: true, dueAt: true, remindAt: true, remindedAt: true },
      take: 500,
    }),
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: { notIn: CLOSED_LEAD_STATUSES },
        nextActionAt: prefs.summaryEnabled ? { lte: to } : { gte: from, lte: to },
      },
      select: { id: true, name: true, nextAction: true, nextActionAt: true, remindedAt: true },
      take: 500,
    }),
  ]);

  // Avisos ya enviados (las claves incluyen elemento, antelación y fecha base).
  const sentRows = await prisma.reminderLog.findMany({
    where: { sentAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60_000) } },
    select: { key: true },
  });
  const sentKeys = new Set(sentRows.map((r) => r.key));

  const { pushes, silentKeys } = planReminders({
    prefs,
    tasks,
    leads,
    sentKeys,
    now,
    timeZone: appDefaults.timezone,
  });

  const results = await Promise.all(
    pushes.map(async (push) => ({
      push,
      result: await broadcastPush({ title: push.title, body: push.body, url: push.url, tag: push.tag }),
    })),
  );
  const delivered = results.filter((r) => r.result.sent > 0);
  const keysToLog = [...delivered.flatMap((r) => r.push.keys), ...silentKeys];
  if (keysToLog.length) {
    await prisma.reminderLog.createMany({
      data: keysToLog.map((key) => ({ key, sentAt: now })),
      skipDuplicates: true,
    });
  }
  // Limpieza: los avisos de más de 60 días ya no pueden repetirse.
  await prisma.reminderLog.deleteMany({
    where: { sentAt: { lt: new Date(now.getTime() - 60 * 24 * 60 * 60_000) } },
  });

  return NextResponse.json({
    ok: true,
    pushConfigured: isPushConfigured(),
    candidates: { tasks: tasks.length, leads: leads.length },
    planned: pushes.length,
    delivered: delivered.length,
  });
}
