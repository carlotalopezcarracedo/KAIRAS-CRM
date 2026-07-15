import { describe, it, expect } from "vitest";
import {
  entryCreateSchema,
  entryUpdateSchema,
  relationCreateSchema,
  listFiltersSchema,
  OS_ENTRY_TYPES,
  OS_STATUSES,
} from "./knowledge";

describe("os/validators — entryCreateSchema", () => {
  it("aplica defaults de estado y autoridad", () => {
    const r = entryCreateSchema.parse({ type: "principio", area: "identidad", title: "X" });
    expect(r.status).toBe("borrador");
    expect(r.authority).toBe("operativo");
    expect(r.businessLine).toBe("transversal");
    expect(r.messageLayer).toBe("na");
  });

  it("recorta y vacía a undefined los opcionales", () => {
    const r = entryCreateSchema.parse({ type: "regla", area: "oferta", title: "  T  ", summary: "   " });
    expect(r.title).toBe("T");
    expect(r.summary).toBeUndefined();
  });

  it("rechaza título vacío", () => {
    expect(() => entryCreateSchema.parse({ type: "regla", area: "oferta", title: "" })).toThrow();
  });

  it("parsea la vigencia (validUntil): fecha -> Date, vacío -> null", () => {
    const conFecha = entryCreateSchema.parse({ type: "oferta", area: "oferta", title: "T", validUntil: "2026-09-30" });
    expect(conFecha.validUntil).toBeInstanceOf(Date);
    const sinFecha = entryCreateSchema.parse({ type: "oferta", area: "oferta", title: "T", validUntil: "" });
    expect(sinFecha.validUntil).toBeNull();
    const invalida = entryCreateSchema.parse({ type: "oferta", area: "oferta", title: "T", validUntil: "no-es-fecha" });
    expect(invalida.validUntil).toBeNull();
  });

  it("rechaza tipo fuera del enum", () => {
    expect(() => entryCreateSchema.parse({ type: "no_existe", area: "x", title: "T" })).toThrow();
  });

  it("cubre todos los tipos y estados declarados", () => {
    expect(OS_ENTRY_TYPES.length).toBeGreaterThanOrEqual(20);
    expect(OS_STATUSES).toContain("vigente");
    expect(OS_STATUSES).toContain("obsoleto");
  });
});

describe("os/validators — entryUpdateSchema", () => {
  it("exige id y admite parciales", () => {
    const r = entryUpdateSchema.parse({ id: "abc", title: "Nuevo", changeReason: "ajuste" });
    expect(r.id).toBe("abc");
    expect(r.title).toBe("Nuevo");
  });
  it("falla sin id", () => {
    expect(() => entryUpdateSchema.parse({ title: "x" })).toThrow();
  });
});

describe("os/validators — relationCreateSchema", () => {
  it("valida una relación correcta", () => {
    const r = relationCreateSchema.parse({ fromId: "a", toId: "b", type: "valida" });
    expect(r.type).toBe("valida");
  });
  it("rechaza tipo de relación inválido", () => {
    expect(() => relationCreateSchema.parse({ fromId: "a", toId: "b", type: "xxx" })).toThrow();
  });
});

describe("os/validators — listFiltersSchema", () => {
  it("todo opcional; strings vacíos → undefined", () => {
    const r = listFiltersSchema.parse({ q: "", status: "vigente" });
    expect(r.q).toBeUndefined();
    expect(r.status).toBe("vigente");
  });
});
