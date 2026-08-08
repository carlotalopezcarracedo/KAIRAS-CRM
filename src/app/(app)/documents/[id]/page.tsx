import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { ADMIN_DOC_CATEGORY } from "@/lib/labels";
import { formatMoney, formatDate, relativeDays } from "@/lib/utils";
import { toDateOnlyInput } from "@/lib/dates";
import { getAdminDocument } from "@/server/services/admin-document-service";
import { DocumentForm, type DocumentFormDefaults } from "../document-form";
import { updateAdminDocumentAction, deleteAdminDocumentAction } from "../actions";

export const metadata: Metadata = { title: "Documento" };

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminDocument(id);
  if (!data) notFound();

  const { document } = data;
  const expired = document.validUntil && document.validUntil < new Date();

  const defaults: DocumentFormDefaults = {
    title: document.title,
    category: document.category,
    fiscalYear: document.fiscalYear?.toString() ?? "",
    fiscalPeriod: document.fiscalPeriod ?? "",
    issuer: document.issuer ?? "",
    reference: document.reference ?? "",
    amount: document.amount?.toString() ?? "",
    issuedAt: toDateOnlyInput(document.issuedAt),
    validUntil: toDateOnlyInput(document.validUntil),
    notes: document.notes ?? "",
  };

  return (
    <div>
      <PageHeader
        title={document.title}
        subtitle={ADMIN_DOC_CATEGORY[document.category].label}
        actions={
          <ConfirmDelete
            action={deleteAdminDocumentAction.bind(null, document.id)}
            title="Eliminar documento"
            description="El documento se archivará (borrado suave). Los archivos adjuntos se conservan."
          />
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Badge tone={ADMIN_DOC_CATEGORY[document.category].tone}>
          {ADMIN_DOC_CATEGORY[document.category].label}
        </Badge>
        {document.fiscalYear ? (
          <span className="text-sm text-mist">
            {document.fiscalYear}
            {document.fiscalPeriod ? ` · ${document.fiscalPeriod}` : ""}
          </span>
        ) : null}
        {document.amount ? (
          <span className="text-sm text-mist">
            {formatMoney(document.amount.toString())}
          </span>
        ) : null}
        {document.validUntil ? (
          <span className={expired ? "text-sm font-semibold text-danger" : "text-sm text-warn"}>
            {expired ? "Caducado" : "Caduca"} {relativeDays(document.validUntil)} (
            {formatDate(document.validUntil)})
          </span>
        ) : null}
      </div>

      <div className="mb-6">
        {/* Reutiliza el panel de archivos: mismo almacenamiento, mismas URLs
            firmadas y mismo borrado que en el resto de fichas. */}
        <AttachmentsPanel
          entityType="admin_document"
          entityId={document.id}
          revalidatePath={`/documents/${document.id}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del documento</CardTitle>
        </CardHeader>
        <CardBody>
          <DocumentForm
            action={updateAdminDocumentAction.bind(null, document.id)}
            defaults={defaults}
            submitLabel="Guardar cambios"
          />
        </CardBody>
      </Card>
    </div>
  );
}
