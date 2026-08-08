"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/field";

/**
 * Selector de fecha y hora con la estética KAIRAS.
 *
 * Es un reemplazo directo de <input type="datetime-local"> y <input
 * type="date">: mismo `name`, mismo `defaultValue` y mismo formato de valor
 * ("YYYY-MM-DDTHH:mm" o "YYYY-MM-DD"), así que los formularios y los
 * validadores de servidor no se enteran del cambio. Igual que el <Select> de
 * este mismo paquete, existe para no depender del widget del sistema
 * operativo, que rompe la estética y cambia en cada navegador.
 *
 * Todo el cálculo se hace sobre números (año, mes, día, hora, minuto), nunca
 * sobre Date con zona horaria. El valor es "hora de pared" de Madrid, igual
 * que en el resto de la app, y convertirlo a Date aquí solo introduciría
 * desfases de un día en los bordes.
 */

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type Parts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

function parseValue(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] ? Number(match[4]) : 0,
    minute: match[5] ? Number(match[5]) : 0,
  };
}

function formatValue(parts: Parts, withTime: boolean): string {
  const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  return withTime ? `${date}T${pad(parts.hour)}:${pad(parts.minute)}` : date;
}

function formatDisplay(parts: Parts, withTime: boolean): string {
  const date = `${pad(parts.day)} ${MONTHS[parts.month - 1].slice(0, 3)} ${parts.year}`;
  return withTime ? `${date}, ${pad(parts.hour)}:${pad(parts.minute)}` : date;
}

function daysInMonth(year: number, month: number): number {
  // Día 0 del mes siguiente = último del actual. En UTC para no depender
  // de la zona del navegador.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Índice del día de la semana con el lunes como 0. */
function weekdayIndex(year: number, month: number, day: number): number {
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

function todayParts(): Parts {
  // La "fecha de hoy" que ve la usuaria es la de Madrid, no la del servidor.
  const madrid = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const parsed = parseValue(madrid.replace(" ", "T"));
  return parsed ?? { year: 2026, month: 1, day: 1, hour: 9, minute: 0 };
}

export function DateTimeField({
  name,
  defaultValue = "",
  withTime = true,
  required,
  disabled,
  className,
  minuteStep = 5,
  onChange,
  "aria-label": ariaLabel,
}: {
  /** Opcional: sin `name` no se envía nada, útil para filtros con onChange. */
  name?: string;
  defaultValue?: string;
  /** false para comportarse como <input type="date">. */
  withTime?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
  onChange?: (value: string) => void;
  "aria-label"?: string;
}) {
  const [value, setValueState] = React.useState(defaultValue);

  const setValue = React.useCallback(
    (next: string) => {
      setValueState(next);
      onChange?.(next);
    },
    [onChange],
  );
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const parsed = parseValue(value);
  const today = React.useMemo(() => todayParts(), []);
  // El mes que se está mirando puede diferir del seleccionado.
  const [view, setView] = React.useState(() => {
    const base = parsed ?? today;
    return { year: base.year, month: base.month };
  });

  // Cerrar al pulsar fuera o con Escape: sin esto el panel se queda abierto
  // y tapa el resto del formulario.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function commit(next: Parts) {
    setValue(formatValue(next, withTime));
  }

  function pickDay(day: number) {
    const base = parsed ?? { ...today, hour: today.hour, minute: 0 };
    commit({ ...base, year: view.year, month: view.month, day });
    // Con hora, el panel sigue abierto para elegirla; sin hora, ya está.
    if (!withTime) setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const month = current.month + delta;
      if (month < 1) return { year: current.year - 1, month: 12 };
      if (month > 12) return { year: current.year + 1, month: 1 };
      return { ...current, month };
    });
  }

  const total = daysInMonth(view.year, view.month);
  const leading = weekdayIndex(view.year, view.month, 1);
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);

  return (
    <div ref={containerRef} className="relative">
      {/* El valor real viaja en un input oculto: el formulario sigue siendo
          un formulario normal y no hace falta JavaScript para enviarlo. */}
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}

      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? "Elegir fecha"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputClass,
          "flex cursor-pointer items-center justify-between gap-2 text-left",
          open && "border-violet-line",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className={parsed ? "text-foam" : "text-faint"}>
          {parsed ? formatDisplay(parsed, withTime) : withTime ? "Elegir fecha y hora" : "Elegir fecha"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {parsed && !required ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Borrar fecha"
              onClick={(e) => {
                e.stopPropagation();
                setValue("");
              }}
              className="rounded p-0.5 text-faint hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <CalendarDays className="h-4 w-4 text-faint" />
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Calendario"
          className="absolute left-0 z-50 mt-2 flex gap-0 rounded-2xl border border-line-strong bg-surface shadow-2xl"
        >
          <div className="w-64 p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => shiftMonth(-1)}
                className="cursor-pointer rounded-lg p-1.5 text-mist hover:bg-raise hover:text-foam"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-foam">
                {MONTHS[view.month - 1]} {view.year}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => shiftMonth(1)}
                className="cursor-pointer rounded-lg p-1.5 text-mist hover:bg-raise hover:text-foam"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />;
                const isSelected =
                  parsed?.year === view.year &&
                  parsed?.month === view.month &&
                  parsed?.day === day;
                const isToday =
                  today.year === view.year &&
                  today.month === view.month &&
                  today.day === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={cn(
                      "cursor-pointer rounded-lg py-1.5 text-center text-sm transition-colors",
                      isSelected
                        ? "bg-violet font-semibold text-white"
                        : isToday
                          ? "bg-violet-soft font-semibold text-lavender"
                          : "text-mist hover:bg-raise hover:text-foam",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
                className="cursor-pointer text-xs font-semibold text-faint hover:text-danger"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = parsed ?? today;
                  setView({ year: today.year, month: today.month });
                  commit({
                    ...base,
                    year: today.year,
                    month: today.month,
                    day: today.day,
                  });
                }}
                className="cursor-pointer text-xs font-semibold text-lavender hover:underline"
              >
                Hoy
              </button>
            </div>
          </div>

          {withTime ? (
            <div className="flex w-28 flex-col border-l border-line">
              <span className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
                Hora
              </span>
              <div className="flex min-h-0 flex-1 gap-1 overflow-hidden px-2 pb-3">
                <ul className="flex-1 overflow-y-auto" style={{ maxHeight: "13.5rem" }}>
                  {hours.map((hour) => (
                    <li key={hour}>
                      <button
                        type="button"
                        onClick={() => commit({ ...(parsed ?? today), hour })}
                        className={cn(
                          "w-full cursor-pointer rounded-md py-1 text-center text-sm transition-colors",
                          parsed?.hour === hour
                            ? "bg-violet font-semibold text-white"
                            : "text-mist hover:bg-raise hover:text-foam",
                        )}
                      >
                        {pad(hour)}
                      </button>
                    </li>
                  ))}
                </ul>
                <ul className="flex-1 overflow-y-auto" style={{ maxHeight: "13.5rem" }}>
                  {minutes.map((minute) => (
                    <li key={minute}>
                      <button
                        type="button"
                        onClick={() => commit({ ...(parsed ?? today), minute })}
                        className={cn(
                          "w-full cursor-pointer rounded-md py-1 text-center text-sm transition-colors",
                          parsed?.minute === minute
                            ? "bg-violet font-semibold text-white"
                            : "text-mist hover:bg-raise hover:text-foam",
                        )}
                      >
                        {pad(minute)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
