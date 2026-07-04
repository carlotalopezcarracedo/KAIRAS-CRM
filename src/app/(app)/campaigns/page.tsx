import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Campañas" };

export default function Page() {
  return (
    <ModuleStub
      title="Campañas"
      phase="Fase 6"
      description="Fuente, canal, presupuesto, UTMs, leads y ventas generadas."
    />
  );
}
