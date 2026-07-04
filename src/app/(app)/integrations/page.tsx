import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Integraciones" };

export default function Page() {
  return (
    <ModuleStub
      title="Integraciones"
      phase="Fase 6"
      description="Centro de integración con Odoo (api/csv/playwright) y Meta Conversions API."
    />
  );
}
