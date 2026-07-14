import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

// Config de pruebas del proyecto. Necesaria para resolver el alias "@/…"
// que usan los módulos bajo test (Vitest no lee los paths de tsconfig).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
});
