import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Tareas" };

export default function Page() {
  return (
    <ModuleStub
      title="Tareas"
      phase="Fase 4"
      description="Vista Hoy, vencidas, próximas y follow-ups asociados a leads, clientes y proyectos."
    />
  );
}
