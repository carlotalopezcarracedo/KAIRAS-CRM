import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Campañas" };

export default function Page() {
  return (
    <ModuleStub
      title="Campañas"
      phase="pendiente"
      description="Campañas por canal con presupuesto, UTMs, leads generados, oportunidades y ventas atribuidas, coste por lead y ROAS estimado."
      meanwhile="los leads ya guardan fuente y UTMs, y el informe «Leads por fuente» muestra qué canal funciona."
    />
  );
}
