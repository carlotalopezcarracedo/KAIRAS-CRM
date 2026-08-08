import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/audit/audit";
import { getStorage, validateFile } from "@/integrations/storage/adapter";

const notDeleted = { deletedAt: null } as const;

export const ATTACHMENT_ENTITY_TYPES = [
  "lead",
  "client",
  "opportunity",
  "project",
  "task",
  "time_entry",
  "invoice_draft",
  "proposal",
  "campaign",
  "admin_document",
] as const;
export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number];

export const ATTACHMENT_KINDS = [
  "proposal",
  "contract",
  "briefing",
  "external_invoice",
  "screenshot",
  "deliverable",
  "brand_asset",
  "client_doc",
  "report",
  "other",
] as const;

/** Comprueba que la entidad asociada existe y no está borrada. */
async function assertEntityExists(entityType: AttachmentEntityType, entityId: string) {
  const lookup: Record<AttachmentEntityType, () => Promise<unknown>> = {
    lead: () => prisma.lead.findFirst({ where: { id: entityId, ...notDeleted } }),
    client: () => prisma.client.findFirst({ where: { id: entityId, ...notDeleted } }),
    opportunity: () =>
      prisma.opportunity.findFirst({ where: { id: entityId, ...notDeleted } }),
    project: () => prisma.project.findFirst({ where: { id: entityId, ...notDeleted } }),
    task: () => prisma.task.findFirst({ where: { id: entityId, ...notDeleted } }),
    time_entry: () =>
      prisma.timeEntry.findFirst({ where: { id: entityId, ...notDeleted } }),
    invoice_draft: () =>
      prisma.invoiceDraftRequest.findFirst({ where: { id: entityId, ...notDeleted } }),
    proposal: () => prisma.proposal.findFirst({ where: { id: entityId, ...notDeleted } }),
    campaign: () => prisma.campaign.findFirst({ where: { id: entityId, ...notDeleted } }),
    admin_document: () =>
      prisma.adminDocument.findFirst({ where: { id: entityId, ...notDeleted } }),
  };
  const entity = await lookup[entityType]();
  if (!entity) throw new Error("ENTITY_NOT_FOUND");
}

export async function listAttachments(
  entityType: AttachmentEntityType,
  entityId: string,
) {
  return prisma.attachment.findMany({
    where: { entityType, entityId, ...notDeleted },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });
}

export async function uploadAttachment(params: {
  userId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
  kind: string;
  notes?: string;
}) {
  const validation = validateFile(params.fileName, params.mimeType, params.data.length);
  if (!validation.ok) throw new Error(`VALIDATION: ${validation.error}`);

  await assertEntityExists(params.entityType, params.entityId);

  const kind = (ATTACHMENT_KINDS as readonly string[]).includes(params.kind)
    ? params.kind
    : "other";

  // Clave opaca: nada del nombre original (evita fugas y colisiones)
  const storageKey = `${params.entityType}/${params.entityId}/${randomUUID()}.${validation.extension}`;

  const storage = getStorage();
  await storage.upload(storageKey, params.data, params.mimeType);

  const attachment = await prisma.attachment.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      name: params.fileName,
      storageKey,
      kind,
      mimeType: params.mimeType,
      sizeBytes: params.data.length,
      notes: params.notes,
      uploadedById: params.userId,
    },
  });

  await audit({
    actorId: params.userId,
    action: "create",
    entityType: "Attachment",
    entityId: attachment.id,
    after: {
      name: params.fileName,
      kind,
      sizeBytes: params.data.length,
      entity: `${params.entityType}:${params.entityId}`,
    },
  });
  return attachment;
}

/** Crea un adjunto que es solo un enlace externo (sin archivo). */
export async function addExternalLink(params: {
  userId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  name: string;
  url: string;
  kind: string;
  notes?: string;
}) {
  await assertEntityExists(params.entityType, params.entityId);
  const kind = (ATTACHMENT_KINDS as readonly string[]).includes(params.kind)
    ? params.kind
    : "other";
  const attachment = await prisma.attachment.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      name: params.name,
      url: params.url,
      kind,
      uploadedById: params.userId,
    },
  });
  await audit({
    actorId: params.userId,
    action: "create",
    entityType: "Attachment",
    entityId: attachment.id,
    after: { name: params.name, kind, external: true },
  });
  return attachment;
}

/**
 * Borra un adjunto: elimina el binario del storage y hace soft delete de la
 * metadata (queda rastro en BD y audit log, pero el archivo desaparece).
 */
export async function deleteAttachment(userId: string, id: string) {
  const attachment = await prisma.attachment.findFirst({
    where: { id, ...notDeleted },
  });
  if (!attachment) throw new Error("NOT_FOUND");

  if (attachment.storageKey) {
    await getStorage().delete(attachment.storageKey);
  }
  await prisma.attachment.update({
    where: { id },
    data: { deletedAt: new Date(), storageKey: null },
  });
  await audit({
    actorId: userId,
    action: "delete",
    entityType: "Attachment",
    entityId: id,
    before: { name: attachment.name, storageKey: attachment.storageKey },
  });
}

export async function getAttachmentForDownload(id: string) {
  return prisma.attachment.findFirst({ where: { id, ...notDeleted } });
}
