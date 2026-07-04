import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ClientForm } from "../client-form";
import { createClientAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NewClientPage() {
  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        subtitle="Si viene de un lead ganado, puedes convertirlo directamente desde el detalle del lead."
      />
      <ClientForm action={createClientAction} submitLabel="Crear cliente" />
    </div>
  );
}
