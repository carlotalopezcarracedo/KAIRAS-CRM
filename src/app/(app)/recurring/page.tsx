import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Recurrentes" };

export default function Page() {
  return (
    <ModuleStub
      title="Recurrentes"
      phase="Fase 4"
      description="Servicios recurrentes por cliente, MRR, periodicidad y próximo ciclo."
    />
  );
}
