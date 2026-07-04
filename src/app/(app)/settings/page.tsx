import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Ajustes" };

export default function Page() {
  return (
    <ModuleStub
      title="Ajustes"
      phase="Fase 6"
      description="Servicios, fuentes, etiquetas, datos de KAIRAS, backups y export/import."
    />
  );
}
