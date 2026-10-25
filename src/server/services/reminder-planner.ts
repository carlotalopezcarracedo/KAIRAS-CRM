/**
 * Planificador de avisos (puro, sin BD): dado el estado de tareas y leads, las
 * preferencias de Ajustes y los avisos ya enviados, decide qué notificaciones
 * mandar ahora. El cron (/api/cron/reminders) solo carga datos, ejecuta el plan
 * y registra las claves en `ReminderLog` para no repetir. `silentKeys` son
 * claves que se registran sin mandar nada (p. ej. resumen de un día vacío).
 */
import type { PriorityValue } from "@/lib/notification-options";
import type { NotificationDefaults } from "./settings-service";

/** Ventana máxima de retraso: un aviso más viejo que esto se descarta. */
export const GRACE_MS = 24 * 60 * 60_000;

export type PlannerTask = {
  id: string;
  title: string;
  priority: PriorityValue;
  dueAt: Date | null;
  remindAt: Date | null;
  /** Aviso heredado del sistema anterior (una sola vez por `remindAt`). */
  remindedAt: Date | null;
};

export type PlannerLead = {
  id: string;
  name: string;
  nextAction: string | null;
  nextActionAt: Date | null;
  remindedAt: Date | null;
};

export type PlannedPush = {
  title: string;
  body: string;
  url: string;
  tag: string;
  /** Claves a registrar en ReminderLog cuando el aviso se entregue. */
  keys: string[];
};

export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export function isQuietHour(hour: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** "en 1 día", "en 30 min", "ahora", "hace 2 h". */
export function describeRemaining(ms: number) {
  const abs = Math.abs(ms);
  if (abs < 60_000) return "ahora";
  const mins = Math.round(abs / 60_000);
  let label: string;
  if (mins < 60) label = `${mins} min`;
  else if (mins < 60 * 24) label = `${Math.round(mins / 60)} h`;
  else {
    const days = Math.round(mins / (60 * 24));
    label = days === 1 ? "1 día" : `${days} días`;
  }
  return ms > 0 ? `en ${label}` : `hace ${label}`;
}

type Alert = { itemKey: string; offset: number; key: string; at: number; base: Date };

/**
 * De todas las antelaciones de un elemento que ya tocan (y no se enviaron),
 * se manda solo la más cercana a la hora real —p. ej. si se crea una tarea que
 * vence en 2 h, no se disparan a la vez «1 día antes» y «1 h antes»—, pero
 * todas se dan por enviadas.
 */
function pickDue(alerts: Alert[], sent: Set<string>, now: number) {
  const due = alerts.filter(
    (a) => a.at <= now && a.at >= now - GRACE_MS && !sent.has(a.key),
  );
  if (due.length === 0) return null;
  const latest = due.reduce((a, b) => (a.offset <= b.offset ? a : b));
  return { latest, keys: due.map((a) => a.key) };
}

export function planReminders(input: {
  prefs: NotificationDefaults;
  tasks: PlannerTask[];
  leads: PlannerLead[];
  sentKeys: Set<string>;
  now: Date;
  timeZone: string;
}): { pushes: PlannedPush[]; silentKeys: string[] } {
  const { prefs, tasks, leads, sentKeys, now, timeZone } = input;
  const nowMs = now.getTime();
  const local = localParts(now, timeZone);
  const quiet = prefs.quietEnabled && isQuietHour(local.hour, prefs.quietStartHour, prefs.quietEndHour);
  const out: PlannedPush[] = [];
  const silentKeys: string[] = [];

  if (prefs.tasksEnabled) {
    for (const task of tasks) {
      if (!prefs.taskPriorities.includes(task.priority)) continue;
      if (quiet && !(prefs.quietAllowUrgent && task.priority === "urgent")) continue;

      const alerts: Alert[] = [];
      // `remindedAt` heredado: el sistema anterior ya avisó de este recordatorio.
      if (task.remindAt && !task.remindedAt) {
        for (const offset of prefs.taskRemindOffsets) {
          alerts.push({
            itemKey: "remind",
            offset,
            key: `task:${task.id}:remind:${offset}:${task.remindAt.getTime()}`,
            at: task.remindAt.getTime() - offset * 60_000,
            base: task.remindAt,
          });
        }
      }
      if (task.dueAt) {
        for (const offset of prefs.taskDueOffsets) {
          alerts.push({
            itemKey: "due",
            offset,
            key: `task:${task.id}:due:${offset}:${task.dueAt.getTime()}`,
            at: task.dueAt.getTime() - offset * 60_000,
            base: task.dueAt,
          });
        }
      }

      for (const group of ["remind", "due"] as const) {
        const due = pickDue(alerts.filter((a) => a.itemKey === group), sentKeys, nowMs);
        if (!due) continue;
        const when = describeRemaining(due.latest.base.getTime() - nowMs);
        out.push({
          title: group === "due" ? `Tarea · vence ${when}` : `Recordatorio · ${when}`,
          body: task.title,
          url: `/tasks/${task.id}`,
          tag: `task-${task.id}-${group}`,
          keys: due.keys,
        });
      }
    }
  }

  if (prefs.leadsEnabled && !quiet) {
    for (const lead of leads) {
      if (!lead.nextActionAt || lead.remindedAt) continue;
      const alerts: Alert[] = prefs.leadFollowUpOffsets.map((offset) => ({
        itemKey: "follow",
        offset,
        key: `lead:${lead.id}:follow:${offset}:${lead.nextActionAt!.getTime()}`,
        at: lead.nextActionAt!.getTime() - offset * 60_000,
        base: lead.nextActionAt!,
      }));
      const due = pickDue(alerts, sentKeys, nowMs);
      if (!due) continue;
      const when = describeRemaining(lead.nextActionAt.getTime() - nowMs);
      out.push({
        title: `Seguimiento · ${when}`,
        body: lead.nextAction ? `${lead.name}: ${lead.nextAction}` : lead.name,
        url: `/leads/${lead.id}`,
        tag: `lead-${lead.id}`,
        keys: due.keys,
      });
    }
  }

  // Resumen diario: una vez al día, a partir de la hora elegida.
  const summaryKey = `summary:${local.ymd}`;
  if (prefs.summaryEnabled && local.hour >= prefs.summaryHour && !sentKeys.has(summaryKey)) {
    const open = prefs.tasksEnabled
      ? tasks.filter((t) => prefs.taskPriorities.includes(t.priority))
      : [];
    const endOfToday = endOfLocalDay(now, timeZone);
    const overdue = prefs.summaryIncludeOverdue
      ? open.filter((t) => t.dueAt && t.dueAt.getTime() < nowMs)
      : [];
    const today = prefs.summaryIncludeToday
      ? open.filter((t) => t.dueAt && t.dueAt.getTime() >= nowMs && t.dueAt.getTime() <= endOfToday)
      : [];
    const followUps =
      prefs.summaryIncludeLeads && prefs.leadsEnabled
        ? leads.filter((l) => l.nextActionAt && l.nextActionAt.getTime() <= endOfToday)
        : [];

    const parts: string[] = [];
    if (overdue.length) parts.push(`${overdue.length} ${overdue.length === 1 ? "tarea vencida" : "tareas vencidas"}`);
    if (today.length) parts.push(`${today.length} ${today.length === 1 ? "tarea para hoy" : "tareas para hoy"}`);
    if (followUps.length) parts.push(`${followUps.length} ${followUps.length === 1 ? "seguimiento" : "seguimientos"}`);

    // Si no hay nada que contar, el día se da por resumido sin molestar.
    if (parts.length) {
      const first = overdue[0] ?? today[0];
      out.push({
        title: "Resumen del día",
        body: parts.join(" · ") + (first ? `\nSiguiente: ${first.title}` : ""),
        url: "/tasks",
        tag: "summary",
        keys: [summaryKey],
      });
    } else {
      silentKeys.push(summaryKey);
    }
  }

  return { pushes: out, silentKeys };
}

/** Instante (ms) del último milisegundo del día local de `date`. */
export function endOfLocalDay(date: Date, timeZone: string) {
  const { ymd } = localParts(date, timeZone);
  // Busca el mediodía del día siguiente en la zona y retrocede a medianoche local.
  const [y, m, d] = ymd.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  // Ajuste por el desfase de la zona en ese instante (iterado una vez basta salvo saltos DST).
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess), timeZone);
    const [py, pm, pd] = p.ymd.split("-").map(Number);
    const delta = Date.UTC(py, pm - 1, pd, p.hour) - Date.UTC(y, m - 1, d + 1, 0);
    guess -= delta;
  }
  return guess - 1;
}
