/**
 * Tema de la interfaz. Se guarda en cookie (no en localStorage) para que el
 * servidor pueda pintar el `data-theme` correcto en el primer HTML: con
 * localStorage habría un parpadeo de oscuro a claro en cada carga.
 */
export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "kairas-theme";
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export const THEME_LABELS: Record<Theme, string> = {
  dark: "Oscuro",
  light: "Claro",
  system: "Según el sistema",
};
