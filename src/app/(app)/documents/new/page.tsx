import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentForm } from "../document-form";
import { createAdminDocumentAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo documento" };

export default function NewDocumentPage() {
  return (
    <div>
      <PageHeader
        title="Nuevo documento"
        subtitle="Al guardar podrás adjuntar el archivo"
      />
      <DocumentForm action={createAdminDocumentAction} submitLabel="Crear documento" />
    </div>
  );
}
