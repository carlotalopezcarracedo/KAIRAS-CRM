import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Calendario" };

export default function Page() {
  return (
    <ModuleStub
      title="Calendario"
      phase="Fase 4"
      description="Vista día/semana/mes/agenda con capas: reuniones, tareas, deadlines y horas trabajadas."
    />
  );
}
