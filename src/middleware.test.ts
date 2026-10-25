import { describe, expect, it } from "vitest";
import { config } from "./middleware";

// Next compila el matcher como path-to-regexp; para esta comprobación basta
// con el patrón tal cual, anclado.
const guarded = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("middleware matcher", () => {
  it("deja fuera lo que se llama sin sesión", () => {
    expect(guarded("/api/cron/reminders")).toBe(false);
    expect(guarded("/sw.js")).toBe(false);
    expect(guarded("/manifest.json")).toBe(false);
  });

  it("protege las páginas de la app", () => {
    expect(guarded("/dashboard")).toBe(true);
    expect(guarded("/api/push/subscribe")).toBe(true);
  });
});
