"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDuration, cn } from "@/lib/utils";
import { EntryForm, type EntrySelectData } from "./entry-form";
import { createEntryAction } from "./actions";

export type GridEntry = {
  id: string;
  dayKey: string; // YYYY-MM-DD (Madrid)
  startMin: number; // minutos desde medianoche Madrid
  durationMin: number;
  title: string;
  subtitle: string;
  billable: boolean;
  locked: boolean;
};

export type GridDay = {
  key: string; // YYYY-MM-DD
  label: string; // "Lun 7"
  totalSeconds: number;
  isToday: boolean;
};

const HOUR_PX = 48;
const SLOT_MIN = 30;
const DAY_HEIGHT = 24 * HOUR_PX;

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type Selection = { dayKey: string; startSlot: number; endSlot: number };

/**
 * Calendario semanal estilo Toggl: los bloques son entradas reales;
 * clic (o arrastre) sobre un hueco crea una entrada en esa franja.
 */
export function WeekGrid({
  days,
  entries,
  selects,
}: {
  days: GridDay[];
  entries: GridEntry[];
  selects: EntrySelectData;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dialogRange, setDialogRange] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [nowMarker, setNowMarker] = useState<{ dayKey: string; min: number } | null>(
    null,
  );

  // Scroll inicial a las 08:00 y línea de "ahora" (hora de Madrid del navegador)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 8 * HOUR_PX });
    const update = () => {
      const parts = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      const [dayKey, hm] = parts.split(" ");
      const [h, m] = hm.split(":").map(Number);
      setNowMarker({ dayKey, min: h * 60 + m });
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  function slotFromEvent(e: React.PointerEvent<HTMLDivElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slot = Math.floor((y / HOUR_PX) * (60 / SLOT_MIN));
    return Math.min(Math.max(slot, 0), (24 * 60) / SLOT_MIN - 1);
  }

  function openDialogFor(sel: Selection) {
    const startMin = Math.min(sel.startSlot, sel.endSlot) * SLOT_MIN;
    const endMin = (Math.max(sel.startSlot, sel.endSlot) + 1) * SLOT_MIN;
    setDialogRange({
      start: `${sel.dayKey}T${minutesToLabel(startMin)}`,
      end: `${sel.dayKey}T${minutesToLabel(Math.min(endMin, 24 * 60 - 1))}`,
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {/* Cabecera de días */}
      <div className="grid grid-cols-[3.25rem_repeat(7,1fr)] border-b border-line bg-ink/40">
        <div />
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              "border-l border-line px-2 py-2 text-center",
              day.isToday && "bg-violet-soft/40",
            )}
          >
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                day.isToday ? "text-lavender" : "text-faint",
              )}
            >
              {day.label}
            </p>
            <p className="font-mono text-[10px] text-mist">
              {day.totalSeconds > 0 ? formatDuration(day.totalSeconds) : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Rejilla */}
      <div ref={scrollRef} className="max-h-[34rem] overflow-y-auto">
        <div
          className="grid grid-cols-[3.25rem_repeat(7,1fr)]"
          style={{ height: DAY_HEIGHT }}
        >
          {/* Eje horario */}
          <div className="relative">
            {Array.from({ length: 24 }).map((_, hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-faint"
                style={{ top: hour * HOUR_PX }}
              >
                {hour > 0 ? `${String(hour).padStart(2, "0")}:00` : ""}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const dayEntries = entries.filter((entry) => entry.dayKey === day.key);
            const isSelecting = selection?.dayKey === day.key;
            const selTop = isSelecting
              ? Math.min(selection.startSlot, selection.endSlot) * (HOUR_PX / 2)
              : 0;
            const selHeight = isSelecting
              ? (Math.abs(selection.endSlot - selection.startSlot) + 1) * (HOUR_PX / 2)
              : 0;

            return (
              <div
                key={day.key}
                className={cn(
                  "relative touch-pan-y select-none border-l border-line",
                  day.isToday && "bg-violet-soft/15",
                )}
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, rgba(225,232,240,0.05) 0, rgba(225,232,240,0.05) 1px, transparent 1px, transparent 48px)",
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("[data-entry]")) return;
                  const slot = slotFromEvent(e);
                  setSelection({ dayKey: day.key, startSlot: slot, endSlot: slot });
                  setDragging(true);
                }}
                onPointerMove={(e) => {
                  if (!dragging || selection?.dayKey !== day.key) return;
                  const slot = slotFromEvent(e);
                  setSelection((sel) => (sel ? { ...sel, endSlot: slot } : sel));
                }}
                onPointerUp={() => {
                  if (dragging && selection?.dayKey === day.key) {
                    setDragging(false);
                    openDialogFor(selection);
                  }
                }}
                onPointerLeave={() => {
                  if (dragging && selection?.dayKey === day.key) setDragging(false);
                }}
              >
                {/* Selección en curso */}
                {isSelecting && (dragging || dialogRange) ? (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 z-10 rounded-md border border-violet-line bg-violet/25"
                    style={{ top: selTop, height: selHeight }}
                  />
                ) : null}

                {/* Línea de ahora */}
                {nowMarker?.dayKey === day.key ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-danger/70"
                    style={{ top: (nowMarker.min / 60) * HOUR_PX }}
                  />
                ) : null}

                {/* Entradas */}
                {dayEntries.map((entry) => {
                  const top = (entry.startMin / 60) * HOUR_PX;
                  const height = Math.max((entry.durationMin / 60) * HOUR_PX, 18);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-entry
                      title={`${entry.title} · ${minutesToLabel(entry.startMin)} (${formatDuration(entry.durationMin * 60)})`}
                      onClick={() => router.push(`/time/${entry.id}`)}
                      className={cn(
                        "absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition-opacity hover:opacity-90",
                        entry.billable
                          ? "border-violet-line bg-violet/30"
                          : "border-line bg-raise/90",
                        entry.locked && "opacity-70",
                      )}
                      style={{ top, height }}
                    >
                      <p className="truncate text-[11px] font-semibold leading-tight text-foam">
                        {entry.title}
                      </p>
                      {height > 34 ? (
                        <p className="truncate text-[10px] leading-tight text-mist">
                          {entry.subtitle || formatDuration(entry.durationMin * 60)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="border-t border-line px-4 py-2 text-xs text-faint">
        Pulsa (o arrastra) sobre un hueco para registrar tiempo · clic en un
        bloque para editarlo
      </p>

      {/* Diálogo de creación con la franja seleccionada */}
      <Dialog
        open={!!dialogRange}
        onOpenChange={(open) => {
          if (!open) {
            setDialogRange(null);
            setSelection(null);
          }
        }}
      >
        {dialogRange ? (
          <DialogContent
            title="Registrar tiempo"
            description={`${dialogRange.start.slice(11)} – ${dialogRange.end.slice(11)} · ${dialogRange.start.slice(0, 10)}`}
            className="max-w-xl"
          >
            <EntryForm
              action={createEntryAction}
              selects={selects}
              defaults={{ startedAt: dialogRange.start, endedAt: dialogRange.end }}
              submitLabel="Registrar"
              onSuccess={() => {
                setDialogRange(null);
                setSelection(null);
                router.refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
