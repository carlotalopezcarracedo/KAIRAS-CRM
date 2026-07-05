/**
 * Fechas en Europe/Madrid SIN depender de la zona horaria del servidor.
 *
 * Motivo: Vercel corre en UTC y además reserva la variable TZ (no se puede
 * fijar). Todo lo que entra por formularios datetime-local/date es "hora de
 * pared" de Madrid y hay que convertirlo explícitamente; y los límites de
 * día ("hoy", "esta semana") deben calcularse en Madrid, no en UTC.
 */

const MADRID = "Europe/Madrid";

const partsFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: MADRID,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Offset (ms) de Madrid respecto a UTC en un instante dado (+1h/+2h). */
function madridOffsetMs(utcMs: number): number {
  // "2026-07-05 11:30:00" = hora de pared en Madrid para ese instante
  const wall = partsFormatter.format(new Date(utcMs));
  const [datePart, timePart] = wall.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss] = timePart.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm, ss) - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Interpreta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm[:ss]" como hora de pared de
 * Madrid y devuelve el instante UTC correcto. Doble pasada para bordes de
 * cambio horario (técnica estándar de date-fns-tz).
 */
export function parseMadridLocal(value: string): Date {
  const [datePart, timePart = "00:00:00"] = value.trim().split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = timePart.split(":").map(Number);
  if (!y || !m || !d) return new Date(NaN);

  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
  let utc = wallAsUtc - madridOffsetMs(wallAsUtc);
  utc = wallAsUtc - madridOffsetMs(utc);
  return new Date(utc);
}

const inputFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: MADRID,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Date → valor para <input type="datetime-local"> en hora de Madrid. */
export function toDateTimeLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  // sv-SE produce "YYYY-MM-DD HH:mm" → datetime-local quiere "T" en medio
  return inputFormatter.format(date).replace(" ", "T");
}

/** Date → valor para <input type="date"> en hora de Madrid. */
export function toDateOnlyInput(date: Date | null | undefined): string {
  if (!date) return "";
  return inputFormatter.format(date).slice(0, 10);
}

/** Clave YYYY-MM-DD del día de Madrid que contiene el instante dado. */
export function madridDayKey(date: Date): string {
  return inputFormatter.format(date).slice(0, 10);
}

/** 00:00:00.000 de Madrid del día que contiene `base` (por defecto ahora). */
export function startOfDayMadrid(base: Date = new Date()): Date {
  return parseMadridLocal(madridDayKey(base));
}

/** 23:59:59.999 de Madrid del día que contiene `base`. */
export function endOfDayMadrid(base: Date = new Date()): Date {
  const start = startOfDayMadrid(base);
  return new Date(start.getTime() + 24 * 3600 * 1000 - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Lunes 00:00 (Madrid) de la semana que contiene `base`. */
export function startOfWeekMadrid(base: Date = new Date()): Date {
  const dayStart = startOfDayMadrid(base);
  // día de la semana en Madrid (0=lunes … 6=domingo)
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID,
    weekday: "short",
  }).format(base);
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  return addDays(dayStart, -Math.max(0, index));
}

/** Día 1 del mes de Madrid (offset 0 = mes actual, -1 = anterior…). */
export function startOfMonthMadrid(monthOffset = 0, base: Date = new Date()): Date {
  const key = madridDayKey(base); // YYYY-MM-DD
  let year = Number(key.slice(0, 4));
  let month = Number(key.slice(5, 7)) + monthOffset;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return parseMadridLocal(`${year}-${String(month).padStart(2, "0")}-01`);
}
