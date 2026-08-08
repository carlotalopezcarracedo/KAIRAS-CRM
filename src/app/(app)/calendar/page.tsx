import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDuration, dateKey } from "@/lib/utils";
import {
  parseMadridLocal,
  startOfDayMadrid,
  endOfDayMadrid,
  startOfWeekMadrid,
  addDays,
} from "@/lib/dates";
import { requireUser } from "@/server/auth";
import {
  getCalendarItems,
  CALENDAR_LAYERS,
  type CalendarLayer,
  type CalendarItem,
} from "@/server/services/calendar-service";
import { EventDialog } from "./event-dialog";

export const metadata: Metadata = { title: "Calendario" };

type View = "month" | "week" | "day";

const LAYER_META: Record<CalendarLayer, { label: string; dot: string }> = {
  events: { label: "Agenda", dot: "bg-violet" },
  tasks: { label: "Tareas", dot: "bg-info" },
  deadlines: { label: "Entregas", dot: "bg-danger" },
  followups: { label: "Seguimientos", dot: "bg-warn" },
  opportunities: { label: "Cierres", dot: "bg-lavender" },
  time: { label: "Horas", dot: "bg-ok" },
};

const DEFAULT_LAYERS: CalendarLayer[] = [
  "events",
  "tasks",
  "deadlines",
  "followups",
  "opportunities",
];

// Ancla: mediodía de Madrid del día pedido (estable frente a DST/UTC)
function parseDate(value: string | undefined): Date {
  if (value) {
    const d = parseMadridLocal(value + "T12:00");
    if (!Number.isNaN(d.getTime())) return d;
  }
  return parseMadridLocal(dateKey(new Date()) + "T12:00");
}

// Clave de día en Europe/Madrid: así celdas e items agrupan igual aunque
// el servidor corra en UTC (Vercel).
function toParam(d: Date): string {
  return dateKey(d);
}

/** Día del mes (número) según el calendario de Madrid. */
function dayNumber(d: Date): number {
  return Number(dateKey(d).slice(8, 10));
}

function buildUrl(view: View, date: Date, layers: CalendarLayer[]): string {
  return `/calendar?view=${view}&date=${toParam(date)}&layers=${layers.join(",")}`;
}

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function ItemPill({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-raise",
        compact ? "text-[11px]" : "text-xs",
      )}
      title={item.title}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", LAYER_META[item.layer].dot)}
      />
      {!item.allDay && !compact ? (
        <span className="shrink-0 font-mono text-faint">
          {timeFormatter.format(item.startAt)}
        </span>
      ) : null}
      <span className="truncate text-mist">{item.title}</span>
      {item.durationSeconds && !compact ? (
        <span className="ml-auto shrink-0 font-mono text-[10px] text-ok">
          {formatDuration(item.durationSeconds)}
        </span>
      ) : null}
    </Link>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = await searchParams;
  const view: View =
    raw.view === "week" || raw.view === "day" ? raw.view : "month";
  const anchor = parseDate(typeof raw.date === "string" ? raw.date : undefined);

  const layersParam = typeof raw.layers === "string" ? raw.layers : "";
  const layers: CalendarLayer[] = layersParam
    ? (layersParam
        .split(",")
        .filter((l) =>
          (CALENDAR_LAYERS as readonly string[]).includes(l),
        ) as CalendarLayer[])
    : DEFAULT_LAYERS;

  // Rango según vista (límites en hora de Madrid)
  let from: Date;
  let to: Date;
  if (view === "day") {
    from = startOfDayMadrid(anchor);
    to = endOfDayMadrid(anchor);
  } else if (view === "week") {
    from = startOfWeekMadrid(anchor);
    to = new Date(addDays(from, 7).getTime() - 1);
  } else {
    const firstOfMonth = parseMadridLocal(dateKey(anchor).slice(0, 7) + "-01T12:00");
    from = startOfWeekMadrid(firstOfMonth);
    to = new Date(addDays(from, 42).getTime() - 1); // 6 semanas
  }

  const items = await getCalendarItems(user.id, from, to, layers);

  // Agrupar por día
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = toParam(item.startAt);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  // Navegación
  const prev = new Date(anchor);
  const next = new Date(anchor);
  if (view === "month") {
    prev.setMonth(prev.getMonth() - 1);
    next.setMonth(next.getMonth() + 1);
  } else if (view === "week") {
    prev.setDate(prev.getDate() - 7);
    next.setDate(next.getDate() + 7);
  } else {
    prev.setDate(prev.getDate() - 1);
    next.setDate(next.getDate() + 1);
  }

  const monthTitle = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(anchor);
  const dayTitle = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(anchor);

  const today = toParam(new Date());
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div>
      <PageHeader
        title="Calendario"
        subtitle={
          view === "day"
            ? dayTitle.charAt(0).toUpperCase() + dayTitle.slice(1)
            : monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)
        }
        actions={<EventDialog anchorDate={toParam(anchor)} />}
      />

      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Link
            href={buildUrl(view, prev, layers)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-mist hover:text-foam"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={buildUrl(view, new Date(), layers)}
            className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-mist hover:text-foam"
          >
            Hoy
          </Link>
          <Link
            href={buildUrl(view, next, layers)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-mist hover:text-foam"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex rounded-full border border-line bg-surface p-0.5">
          {(
            [
              ["day", "Día"],
              ["week", "Semana"],
              ["month", "Mes"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={buildUrl(v, anchor, layers)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                view === v
                  ? "bg-violet-soft text-lavender"
                  : "text-faint hover:text-foam",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Capas */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="k-label mr-1">Capas</span>
        {CALENDAR_LAYERS.map((layer) => {
          const active = layers.includes(layer);
          const nextLayers = active
            ? layers.filter((l) => l !== layer)
            : [...layers, layer];
          return (
            <Link
              key={layer}
              href={buildUrl(view, anchor, nextLayers.length ? nextLayers : ["events"])}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? "border-line-strong bg-raise text-foam"
                  : "border-line bg-surface text-faint opacity-60 hover:opacity-100",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", LAYER_META[layer].dot)} />
              {LAYER_META[layer].label}
            </Link>
          );
        })}
        <span className="mx-1 text-line-strong">·</span>
        <Link
          href={buildUrl(view, anchor, DEFAULT_LAYERS)}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-faint hover:text-foam"
        >
          Agenda
        </Link>
        <Link
          href={buildUrl(view, anchor, ["time"])}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-faint hover:text-foam"
        >
          Horas
        </Link>
        <Link
          href={buildUrl(view, anchor, [...CALENDAR_LAYERS])}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-faint hover:text-foam"
        >
          Todo
        </Link>
      </div>

      {/* Vista MES */}
      {view === "month" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-px">
              {weekDays.map((d) => (
                <div key={d} className="k-label px-2 pb-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-line bg-line">
              {Array.from({ length: 42 }).map((_, i) => {
                const cellDate = addDays(from, i);
                const key = toParam(cellDate);
                const dayItems = byDay.get(key) ?? [];
                const isToday = key === today;
                const inMonth = cellDate.getMonth() === anchor.getMonth();
                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-24 bg-surface p-1.5",
                      !inMonth && "opacity-40",
                    )}
                  >
                    <Link
                      href={buildUrl("day", cellDate, layers)}
                      className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        isToday
                          ? "bg-violet text-white"
                          : "text-faint hover:text-foam",
                      )}
                    >
                      {dayNumber(cellDate)}
                    </Link>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <ItemPill key={item.id} item={item} compact />
                      ))}
                      {dayItems.length > 3 ? (
                        <Link
                          href={buildUrl("day", cellDate, layers)}
                          className="block px-1.5 text-[11px] font-semibold text-lavender"
                        >
                          +{dayItems.length - 3} más
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Vista SEMANA */}
      {view === "week" ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => {
            const cellDate = addDays(from, i);
            const key = toParam(cellDate);
            const dayItems = byDay.get(key) ?? [];
            const isToday = key === today;
            const daySeconds = dayItems
              .filter((it) => it.layer === "time")
              .reduce((acc, it) => acc + (it.durationSeconds ?? 0), 0);
            return (
              <div
                key={key}
                className={cn(
                  "rounded-card border bg-surface p-3",
                  isToday ? "border-violet-line" : "border-line",
                )}
              >
                <Link
                  href={buildUrl("day", cellDate, layers)}
                  className="mb-2 flex items-baseline justify-between"
                >
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      isToday ? "text-lavender" : "text-faint",
                    )}
                  >
                    {weekDays[i]} {dayNumber(cellDate)}
                  </span>
                  {daySeconds > 0 ? (
                    <span className="font-mono text-[10px] text-ok">
                      {formatDuration(daySeconds)}
                    </span>
                  ) : null}
                </Link>
                <div className="space-y-1">
                  {dayItems.length === 0 ? (
                    <p className="py-2 text-center text-xs text-faint">—</p>
                  ) : (
                    dayItems.map((item) => <ItemPill key={item.id} item={item} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Vista DÍA */}
      {view === "day" ? (
        <div className="max-w-2xl">
          {(byDay.get(toParam(anchor)) ?? []).length === 0 ? (
            <EmptyState
              title="Nada programado este día"
              hint="Crea un evento o cambia las capas activas."
            />
          ) : (
            <div className="space-y-2">
              {(byDay.get(toParam(anchor)) ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      LAYER_META[item.layer].dot,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foam">
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-faint">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-mist">
                    {item.allDay ? (
                      "Todo el día"
                    ) : (
                      <>
                        {timeFormatter.format(item.startAt)}
                        {item.endAt ? `–${timeFormatter.format(item.endAt)}` : ""}
                      </>
                    )}
                    {item.durationSeconds ? (
                      <span className="block font-mono text-ok">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
