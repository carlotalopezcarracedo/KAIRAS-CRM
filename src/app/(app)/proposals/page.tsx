import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Propuestas" };

export default function Page() {
  return (
    <ModuleStub
      title="Propuestas"
      phase="Fase 5"
      description="Draft, enviada, aceptada o rechazada; crear proyecto y solicitud de factura al aceptar. Mientras tanto, registra propuestas como oportunidades en etapa Propuesta enviada."
    />
  );
}
