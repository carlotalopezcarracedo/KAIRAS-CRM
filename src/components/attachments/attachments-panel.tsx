import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listAttachments,
  type AttachmentEntityType,
} from "@/server/services/attachment-service";
import { getStorageConfig } from "@/integrations/storage/adapter";
import { AttachmentUploader } from "./attachment-uploader";
import { AttachmentRow, type AttachmentData } from "./attachment-row";

/**
 * Panel de archivos reutilizable. Montar en el detalle de cualquier entidad:
 * <AttachmentsPanel entityType="client" entityId={id} revalidatePath={`/clients/${id}`} />
 */
export async function AttachmentsPanel({
  entityType,
  entityId,
  revalidatePath,
}: {
  entityType: AttachmentEntityType;
  entityId: string;
  revalidatePath: string;
}) {
  const [attachments, config] = await Promise.all([
    listAttachments(entityType, entityId),
    Promise.resolve(getStorageConfig()),
  ]);

  const rows: AttachmentData[] = attachments.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    uploadedByName: a.uploadedBy?.name ?? null,
    isExternal: !a.storageKey && !!a.url,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivos ({rows.length})</CardTitle>
        {config.driver === "local" ? (
          <span
            className="text-[10px] font-semibold uppercase tracking-widest text-warn"
            title="Los archivos se guardan en este ordenador (.uploads/). En producción con Supabase Storage tendrán backup y acceso desde cualquier sitio."
          >
            almacenamiento local
          </span>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3">
        <AttachmentUploader
          entityType={entityType}
          entityId={entityId}
          revalidatePath={revalidatePath}
          maxFileMb={config.maxFileMb}
        />
        {rows.length === 0 ? (
          <p className="text-sm text-faint">
            Sin archivos. Propuestas, contratos, briefings, capturas… todo lo de
            esta ficha, en un sitio.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
