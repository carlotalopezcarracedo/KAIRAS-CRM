import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Tiempo" };

export default function Page() {
  return (
    <ModuleStub
      title="Tiempo"
      phase="Fase 4"
      description="Cronómetro, entradas manuales, horas facturables e informes por cliente y proyecto."
    />
  );
}
