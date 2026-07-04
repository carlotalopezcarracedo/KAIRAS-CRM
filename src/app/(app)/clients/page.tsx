import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return (
    <ModuleStub
      title="Clientes"
      phase="Fase 4"
      description="Clientes activos, servicios contratados, proyectos y facturación vinculada."
    />
  );
}
