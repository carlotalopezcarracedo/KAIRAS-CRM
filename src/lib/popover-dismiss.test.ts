import { describe, it, expect } from "vitest";
import { isFromPopover, POPOVER_SELECTOR } from "./popover-dismiss";

/** Nodo falso con lo justo que mira la función. */
function fakeNode({
  isConnected = true,
  matchesSelector = false,
}: {
  isConnected?: boolean;
  matchesSelector?: boolean;
} = {}) {
  return {
    isConnected,
    closest(selectors: string) {
      return matchesSelector && selectors === POPOVER_SELECTOR ? {} : null;
    },
  };
}

describe("isFromPopover", () => {
  it("reconoce un clic dentro del panel de un desplegable", () => {
    expect(isFromPopover(fakeNode({ matchesSelector: true }))).toBe(true);
  });

  it("reconoce un nodo ya desmontado", () => {
    // Es el caso que cerraba el diálogo: al elegir opción, Radix desmonta el
    // panel y el objetivo del evento queda huérfano.
    expect(isFromPopover(fakeNode({ isConnected: false }))).toBe(true);
  });

  it("un clic de verdad fuera sí debe cerrar el diálogo", () => {
    expect(isFromPopover(fakeNode())).toBe(false);
  });

  it("un nodo desmontado que además era del panel también cuenta", () => {
    expect(isFromPopover(fakeNode({ isConnected: false, matchesSelector: true }))).toBe(
      true,
    );
  });

  it("no revienta con valores que no son nodos", () => {
    expect(isFromPopover(null)).toBe(false);
    expect(isFromPopover(undefined)).toBe(false);
    expect(isFromPopover("texto")).toBe(false);
    expect(isFromPopover(42)).toBe(false);
    expect(isFromPopover({})).toBe(false);
    // Un objeto con closest que no es función no debe romper.
    expect(isFromPopover({ closest: "no soy funcion" })).toBe(false);
  });

  it("el selector cubre Select, menús y listbox", () => {
    expect(POPOVER_SELECTOR).toContain("data-radix-popper-content-wrapper");
    expect(POPOVER_SELECTOR).toContain("data-radix-select-content");
    expect(POPOVER_SELECTOR).toContain("data-radix-menu-content");
    expect(POPOVER_SELECTOR).toContain("role='listbox'");
  });
});
