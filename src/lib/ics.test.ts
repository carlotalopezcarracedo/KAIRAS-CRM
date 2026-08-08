import { describe, it, expect } from "vitest";
import {
  escapeText,
  foldLine,
  formatUtc,
  formatDateOnly,
  buildIcsCalendar,
} from "./ics";

describe("escapeText", () => {
  it("escapa los caracteres que RFC 5545 reserva", () => {
    expect(escapeText("Reunión; con café, y más")).toBe(
      "Reunión\\; con café\\, y más",
    );
  });

  it("escapa la barra invertida antes que el resto", () => {
    expect(escapeText("a\\b;c")).toBe("a\\\\b\\;c");
  });

  it("convierte los saltos de línea", () => {
    expect(escapeText("linea1\nlinea2")).toBe("linea1\\nlinea2");
    expect(escapeText("linea1\r\nlinea2")).toBe("linea1\\nlinea2");
  });
});

describe("foldLine", () => {
  it("deja intactas las líneas cortas", () => {
    expect(foldLine("SUMMARY:corto")).toBe("SUMMARY:corto");
  });

  it("pliega por octetos, no por caracteres", () => {
    // 80 acentos = 160 bytes en UTF-8: contando caracteres no se plegaría.
    const line = `SUMMARY:${"á".repeat(80)}`;
    const folded = foldLine(line);
    expect(folded).toContain("\r\n ");
    for (const part of folded.split("\r\n")) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    }
  });

  it("las continuaciones empiezan por espacio", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts.slice(1)) expect(part.startsWith(" ")).toBe(true);
  });
});

describe("formatos de fecha", () => {
  it("formatea en UTC compacto", () => {
    expect(formatUtc(new Date("2026-08-08T09:30:00Z"))).toBe("20260808T093000Z");
  });

  it("el día completo usa la fecha de Madrid, no la de UTC", () => {
    // 23:30 UTC del 7 ya es día 8 en Madrid (verano, UTC+2).
    expect(formatDateOnly(new Date("2026-08-07T23:30:00Z"))).toBe("20260808");
  });
});

describe("buildIcsCalendar", () => {
  const now = new Date("2026-08-08T12:00:00Z");

  it("genera una envoltura válida", () => {
    const ics = buildIcsCalendar([], { name: "KAIRAS", now });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("X-WR-TIMEZONE:Europe/Madrid");
  });

  it("usa CRLF en todas las líneas", () => {
    const ics = buildIcsCalendar(
      [{ uid: "a@kairas", start: new Date("2026-08-10T08:00:00Z"), summary: "Test" }],
      { name: "KAIRAS", now },
    );
    // Ningún \n suelto sin su \r delante.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("un evento con hora lleva DTSTART y DTEND", () => {
    const ics = buildIcsCalendar(
      [
        {
          uid: "evt1@kairas",
          start: new Date("2026-08-10T08:00:00Z"),
          end: new Date("2026-08-10T09:30:00Z"),
          summary: "Reunión",
          location: "Oficina",
        },
      ],
      { name: "KAIRAS", now },
    );
    expect(ics).toContain("DTSTART:20260810T080000Z");
    expect(ics).toContain("DTEND:20260810T093000Z");
    expect(ics).toContain("LOCATION:Oficina");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("sin fin declarado asume una hora", () => {
    const ics = buildIcsCalendar(
      [{ uid: "evt2@kairas", start: new Date("2026-08-10T08:00:00Z"), summary: "X" }],
      { name: "KAIRAS", now },
    );
    expect(ics).toContain("DTEND:20260810T090000Z");
  });

  it("el día completo usa VALUE=DATE y DTEND exclusivo", () => {
    const ics = buildIcsCalendar(
      [
        {
          uid: "evt3@kairas",
          start: new Date("2026-08-10T10:00:00Z"),
          allDay: true,
          summary: "Festivo",
        },
      ],
      { name: "KAIRAS", now },
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260810");
    // Exclusivo: un día suelto termina el 11.
    expect(ics).toContain("DTEND;VALUE=DATE:20260811");
  });

  it("marca los cancelados en vez de omitirlos", () => {
    const ics = buildIcsCalendar(
      [
        {
          uid: "evt4@kairas",
          start: new Date("2026-08-10T08:00:00Z"),
          summary: "Anulada",
          cancelled: true,
        },
      ],
      { name: "KAIRAS", now },
    );
    expect(ics).toContain("STATUS:CANCELLED");
  });
});
