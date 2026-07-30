import { describe, expect, it } from "vitest";
import { normalizeSearchText, scoreKnowledgeMatch } from "./os-search";

describe("búsqueda de KAIRAS OS", () => {
  it("normaliza acentos, signos y mayúsculas", () => {
    expect(normalizeSearchText("  Decisión · ESTÉTICA  ")).toBe("decision estetica");
  });

  it("prioriza coincidencias de título", () => {
    const title = scoreKnowledgeMatch("precios", { title: "Precios vigentes", summary: "Oferta" });
    const summary = scoreKnowledgeMatch("precios", { title: "Oferta", summary: "Consulta los precios" });
    expect(title).toBeGreaterThan(summary);
  });

  it("tolera un error tipográfico leve", () => {
    expect(scoreKnowledgeMatch("estetcia", { title: "Clínica de estética" })).toBeGreaterThan(0);
  });

  it("ignora conectores en preguntas naturales", () => {
    expect(
      scoreKnowledgeMatch("mensaje frío para una clínica", {
        title: "Guion de apertura",
        summary: "mensaje outreach frío para clínica y centro de estética",
      }),
    ).toBeGreaterThan(0);
  });

  it("no devuelve coincidencias irrelevantes", () => {
    expect(scoreKnowledgeMatch("constitución", { title: "Paleta visual", summary: "Colores" })).toBe(0);
  });
});
