import { describe, expect, it } from "vitest";
import {
  OS_SECTIONS,
  canonicalSectionSlug,
  getSection,
  sectionForEntry,
} from "./_sections";

describe("arquitectura de información de KAIRAS OS", () => {
  it("presenta Estrategia como primera lectura transversal", () => {
    expect(OS_SECTIONS[0]?.slug).toBe("estrategia");
    expect(getSection("estrategia")?.areas).toEqual(
      expect.arrayContaining(["identidad", "oferta", "comercial", "validacion"]),
    );
  });

  it("mantiene /os/estrategia como ruta canónica propia", () => {
    expect(canonicalSectionSlug("estrategia")).toBe("estrategia");
  });

  it("no convierte la vista transversal en URL canónica de las fuentes", () => {
    expect(sectionForEntry("identidad", "principio")?.slug).toBe("marca");
    expect(sectionForEntry("oferta", "oferta")?.slug).toBe("oferta");
    expect(sectionForEntry("validacion", "decision")?.slug).toBe("aprendizaje");
  });

  it("conserva Playbooks como destino prioritario por tipo", () => {
    expect(sectionForEntry("comercial", "playbook")?.slug).toBe("playbooks");
  });
});
