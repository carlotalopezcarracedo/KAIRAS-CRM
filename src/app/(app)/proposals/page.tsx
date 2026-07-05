import type { Metadata } from "next";
import { ModuleStub } from "@/components/shell/module-stub";

export const metadata: Metadata = { title: "Propuestas" };

export default function Page() {
  return (
    <ModuleStub
      title="Propuestas"
      phase="siguiente bloque"
      description="Gestión de propuestas con estados (borrador, enviada, aceptada, rechazada), versiones, importes con IVA y acciones al aceptar: crear proyecto y solicitud de factura automáticamente."
      meanwhile="registra la propuesta como oportunidad en etapa «Propuesta enviada» y adjunta el PDF en los archivos de la oportunidad."
    />
  );
}
