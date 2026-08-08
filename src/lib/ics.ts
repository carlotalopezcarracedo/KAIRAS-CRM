/**
 * Generador de iCalendar (RFC 5545).
 *
 * Se escribe a mano porque el formato es pequeño y las trampas son conocidas:
 * plegado de líneas a 75 octetos, escapado de comas y puntos y coma, y saltos
 * CRLF. Un ICS mal plegado lo rechazan iOS y Google sin decir por qué.
 */

export type IcsEvent = {
  uid: string;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
  summary: string;
  description?: string | null;
  location?: string | null;
  /** cancelled marca el evento como CANCELLED en vez de omitirlo. */
  cancelled?: boolean;
  updatedAt?: Date | null;
};

/** Escapa según RFC 5545 §3.3.11. El orden importa: la barra va primero. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Pliega a 75 octetos (no caracteres): un acento ocupa 2 bytes en UTF-8 y
 * contar caracteres desborda el límite con textos en español.
 */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  // El límite es 75 en la primera línea y 74 en las siguientes (el espacio
  // inicial de continuación cuenta).
  let limit = 75;

  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    if (currentBytes + size > limit) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) chunks.push(current);

  return chunks.join("\r\n ");
}

/** YYYYMMDDTHHMMSSZ en UTC. */
export function formatUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** YYYYMMDD en la zona indicada, para eventos de día completo. */
export function formatDateOnly(date: Date, timeZone = "Europe/Madrid"): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function buildIcsEvent(event: IcsEvent, now: Date): string[] {
  const lines: string[] = ["BEGIN:VEVENT", `UID:${event.uid}`];
  lines.push(`DTSTAMP:${formatUtc(now)}`);

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.start)}`);
    // DTEND es exclusivo: un evento de un día acaba el día siguiente.
    const end = event.end ?? event.start;
    lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addDays(end, 1))}`);
  } else {
    lines.push(`DTSTART:${formatUtc(event.start)}`);
    // Sin fin declarado se asume una hora: dejar el evento sin DTEND hace
    // que algunos clientes lo pinten como si durase todo el día.
    lines.push(
      `DTEND:${formatUtc(event.end ?? new Date(event.start.getTime() + 3_600_000))}`,
    );
  }

  lines.push(`SUMMARY:${escapeText(event.summary)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  lines.push(`STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`);
  if (event.updatedAt) lines.push(`LAST-MODIFIED:${formatUtc(event.updatedAt)}`);
  lines.push("END:VEVENT");

  return lines;
}

export function buildIcsCalendar(
  events: readonly IcsEvent[],
  options: { name: string; description?: string; now?: Date } = { name: "KAIRAS" },
): string {
  const now = options.now ?? new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KAIRAS OS//Calendario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    "X-WR-TIMEZONE:Europe/Madrid",
    // Sugerencia de refresco. iOS y Google la respetan a su manera, pero sin
    // ella algunos clientes tardan mucho más en volver a mirar.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  if (options.description) {
    lines.push(`X-WR-CALDESC:${escapeText(options.description)}`);
  }

  for (const event of events) lines.push(...buildIcsEvent(event, now));
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
