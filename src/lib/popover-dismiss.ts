/**
 * Decide si una interacción "fuera" de un diálogo viene en realidad de un
 * desplegable abierto DENTRO de él.
 *
 * Radix portaliza los paneles de Select y de los menús a `document.body`, así
 * que en el DOM son hermanos del diálogo, no hijos. Al elegir una opción el
 * panel se desmonta y el evento llega al diálogo con un objetivo que ya no
 * está dentro: lo toma por un clic fuera y se cierra solo. De ahí que el
 * síntoma fuera intermitente — depende de si el nodo ya se había desmontado.
 *
 * Se comprueba por "pato" en vez de con `instanceof Element` a propósito:
 * así funciona también entre realms (iframes) y se puede probar sin DOM.
 */

export const POPOVER_SELECTOR =
  "[data-radix-popper-content-wrapper]," +
  "[data-radix-select-content]," +
  "[data-radix-menu-content]," +
  "[role='listbox']";

type MaybeElement = {
  isConnected?: unknown;
  closest?: unknown;
};

export function isFromPopover(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;

  const element = target as MaybeElement;
  if (typeof element.closest !== "function") return false;

  // Nodo ya desmontado: formaba parte del panel que acaba de cerrarse.
  if (element.isConnected === false) return true;

  const closest = element.closest as (selectors: string) => unknown;
  return Boolean(closest.call(element, POPOVER_SELECTOR));
}
