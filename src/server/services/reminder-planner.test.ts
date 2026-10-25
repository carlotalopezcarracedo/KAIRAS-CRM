import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATIONS } from "./settings-service";
import {
  endOfLocalDay,
  isQuietHour,
  planReminders,
  type PlannerLead,
  type PlannerTask,
} from "./reminder-planner";

const TZ = "Europe/Madrid";
// 2026-10-26 10:00 hora de Madrid (UTC+1 tras el cambio de hora del 25-oct).
const NOW = new Date("2026-10-26T09:00:00Z");
const min = (m: number) => new Date(NOW.getTime() + m * 60_000);

const task = (over: Partial<PlannerTask> = {}): PlannerTask => ({
  id: "t1",
  title: "Enviar propuesta",
  priority: "medium",
  dueAt: null,
  remindAt: null,
  remindedAt: null,
  ...over,
});
const lead = (over: Partial<PlannerLead> = {}): PlannerLead => ({
  id: "l1",
  name: "Clínica Sol",
  nextAction: "Llamar",
  nextActionAt: null,
  remindedAt: null,
  ...over,
});
const run = (
  prefs: Partial<typeof DEFAULT_NOTIFICATIONS>,
  tasks: PlannerTask[],
  leads: PlannerLead[] = [],
  sent: string[] = [],
  now = NOW,
) =>
  planReminders({
    prefs: { ...DEFAULT_NOTIFICATIONS, ...prefs },
    tasks,
    leads,
    sentKeys: new Set(sent),
    now,
    timeZone: TZ,
  });

describe("planReminders · varias antelaciones", () => {
  const prefs = { taskDueOffsets: [1440, 60, 0] };

  it("avisa solo cuando toca cada antelación", () => {
    const t = task({ dueAt: min(60 * 24 * 3) });
    expect(run(prefs, [t]).pushes).toHaveLength(0);

    const day = run(prefs, [task({ dueAt: min(1440) })]);
    expect(day.pushes).toHaveLength(1);
    expect(day.pushes[0].title).toContain("1 día");
  });

  it("no repite un aviso ya enviado y sí manda el siguiente", () => {
    const dueAt = min(60);
    const first = run(prefs, [task({ dueAt })]);
    expect(first.pushes).toHaveLength(1);
    // La de 1 día y la de 1 h tocan a la vez: sale una sola y ambas se dan por enviadas.
    expect(first.pushes[0].keys).toHaveLength(2);

    const again = run(prefs, [task({ dueAt })], [], first.pushes[0].keys);
    expect(again.pushes).toHaveLength(0);

    const atDue = run(prefs, [task({ dueAt })], [], first.pushes[0].keys, min(60));
    expect(atDue.pushes).toHaveLength(1);
    expect(atDue.pushes[0].title).toContain("ahora");
  });

  it("descarta avisos con más de 24 h de retraso", () => {
    expect(run({ taskDueOffsets: [0] }, [task({ dueAt: min(-60 * 30) })]).pushes).toHaveLength(0);
  });

  it("si cambia la fecha, es un aviso nuevo", () => {
    const old = run({ taskDueOffsets: [0] }, [task({ dueAt: min(-5) })]);
    const moved = run({ taskDueOffsets: [0] }, [task({ dueAt: min(-3) })], [], old.pushes[0].keys);
    expect(moved.pushes).toHaveLength(1);
  });
});

describe("planReminders · filtros", () => {
  it("respeta la prioridad elegida", () => {
    const t = task({ priority: "low", remindAt: min(-1) });
    expect(run({ taskPriorities: ["high", "urgent"] }, [t]).pushes).toHaveLength(0);
    expect(run({ taskPriorities: ["low"] }, [t]).pushes).toHaveLength(1);
  });

  it("puede apagar tareas o leads por separado", () => {
    const t = task({ remindAt: min(-1) });
    const l = lead({ nextActionAt: min(-1) });
    expect(run({ tasksEnabled: false }, [t], [l]).pushes.map((p) => p.url)).toEqual(["/leads/l1"]);
    expect(run({ leadsEnabled: false }, [t], [l]).pushes.map((p) => p.url)).toEqual(["/tasks/t1"]);
  });

  it("ignora el recordatorio heredado ya enviado", () => {
    const t = task({ remindAt: min(-1), remindedAt: min(-2) });
    expect(run({}, [t]).pushes).toHaveLength(0);
  });
});

describe("planReminders · modo silencio", () => {
  const quiet = { quietEnabled: true, quietStartHour: 9, quietEndHour: 12 };

  it("retiene los avisos y deja pasar las urgentes", () => {
    const normal = task({ remindAt: min(-1) });
    const urgent = task({ id: "t2", priority: "urgent", remindAt: min(-1) });
    expect(run(quiet, [normal]).pushes).toHaveLength(0);
    expect(run(quiet, [normal, urgent]).pushes.map((p) => p.url)).toEqual(["/tasks/t2"]);
    expect(run({ ...quiet, quietAllowUrgent: false }, [urgent]).pushes).toHaveLength(0);
  });

  it("al terminar el silencio llegan los pendientes", () => {
    const t = task({ remindAt: min(-1) });
    expect(run(quiet, [t], [], [], min(180)).pushes).toHaveLength(1);
  });

  it("entiende rangos que cruzan la medianoche", () => {
    expect(isQuietHour(23, 22, 8)).toBe(true);
    expect(isQuietHour(3, 22, 8)).toBe(true);
    expect(isQuietHour(12, 22, 8)).toBe(false);
  });
});

describe("planReminders · resumen diario", () => {
  const prefs = { summaryEnabled: true, summaryHour: 9 };

  it("cuenta vencidas, de hoy y seguimientos en un solo aviso", () => {
    const tasks = [
      task({ id: "a", dueAt: min(-60 * 48) }),
      task({ id: "b", dueAt: min(120) }),
      task({ id: "c", dueAt: min(60 * 40) }),
    ];
    const leads = [lead({ nextActionAt: min(30) })];
    const { pushes } = run(prefs, tasks, leads);
    const summary = pushes.find((p) => p.tag === "summary")!;
    expect(summary.body).toContain("1 tarea vencida");
    expect(summary.body).toContain("1 tarea para hoy");
    expect(summary.body).toContain("1 seguimiento");
    expect(summary.keys).toEqual(["summary:2026-10-26"]);
  });

  it("solo una vez al día y no antes de la hora", () => {
    const tasks = [task({ dueAt: min(-60 * 48) })];
    expect(run(prefs, tasks, [], ["summary:2026-10-26"]).pushes).toHaveLength(0);
    expect(run({ ...prefs, summaryHour: 11 }, tasks).pushes).toHaveLength(0);
  });

  it("un día vacío se registra sin molestar", () => {
    const res = run(prefs, []);
    expect(res.pushes).toHaveLength(0);
    expect(res.silentKeys).toEqual(["summary:2026-10-26"]);
  });
});

describe("endOfLocalDay", () => {
  it("devuelve el final del día en la zona, también con cambio de hora", () => {
    // 26-oct-2026: Madrid UTC+1 → 23:59:59.999 locales = 22:59:59.999Z
    expect(new Date(endOfLocalDay(NOW, TZ)).toISOString()).toBe("2026-10-26T22:59:59.999Z");
    // 25-oct-2026 (día de 25 h): termina también a las 23:59 locales = 22:59Z
    expect(new Date(endOfLocalDay(new Date("2026-10-25T10:00:00Z"), TZ)).toISOString()).toBe(
      "2026-10-25T22:59:59.999Z",
    );
  });
});
