import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Proyectos" };

export default function Page() {
  return (
    <ModuleStub
      title="Proyectos"
      phase="Fase 4"
      description="Estados, tareas, entregables, deadlines, alcance y fuera de alcance."
    />
  );
}
