/**
 * Reproduce la base de conocimiento normalizada en orden de dependencia.
 *
 * Cada fase usa upsert por externalKey y solo escribe en tablas `os_*`.
 * Este orquestador no interpreta documentos originales en tiempo de ejecución:
 * ejecuta el corpus normalizado y revisado que vive en los tres seed-os.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const phases = [
  "prisma/seed-os.ts",
  "prisma/seed-os-fase-b.ts",
  "prisma/seed-os-fase-c.ts",
  "scripts/verify-kairas-os-import.ts",
];

for (const phase of phases) {
  console.log(`\n→ ${phase}`);
  const result = spawnSync(process.execPath, [tsxCli, path.join(root, phase)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`Importación detenida en ${phase}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✅ Importación de KAIRAS OS completada y verificada.");

