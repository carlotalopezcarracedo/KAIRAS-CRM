import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceForm } from "../service-form";
import { createServiceAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo servicio" };

export default function NewServicePage() {
  return (
    <div>
      <PageHeader title="Nuevo servicio" />
      <ServiceForm action={createServiceAction} submitLabel="Crear servicio" />
    </div>
  );
}
