import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Servicios" };

export default function Page() {
  return (
    <ModuleStub
      title="Servicios"
      phase="Fase 4"
      description="Catálogo editable de servicios con precios, IVA y recurrencia."
    />
  );
}
