import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Pipeline" };

export default function Page() {
  return (
    <ModuleStub
      title="Pipeline"
      phase="Fase 3"
      description="Kanban de oportunidades por etapa, valor estimado, probabilidad y siguiente acción."
    />
  );
}
