import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Finanzas" };

export default function Page() {
  return (
    <ModuleStub
      title="Finanzas"
      phase="Fase 5"
      description="Ingresos previstos y aceptados, pendiente de emitir y cobrar, cola de facturación Odoo."
    />
  );
}
