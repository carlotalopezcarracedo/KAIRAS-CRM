import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import {
  uploadAttachment,
  ATTACHMENT_ENTITY_TYPES,
  type AttachmentEntityType,
} from "@/server/services/attachment-service";

/**
 * Subida de archivos (multipart/form-data).
 * Campos: file, entityType, entityId, kind, notes?
 * Nota: en Vercel el body está limitado a ~4,5 MB; MAX_FILE_MB debe quedar
 * por debajo (4 MB por defecto).
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Formato de subida no válido." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  const kind = String(formData.get("kind") ?? "other");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (
    !(ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(entityType) ||
    !entityId
  ) {
    return NextResponse.json({ error: "Entidad no válida." }, { status: 400 });
  }

  try {
    const data = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadAttachment({
      userId: user.id,
      entityType: entityType as AttachmentEntityType,
      entityId,
      fileName: file.name,
      mimeType: file.type,
      data,
      kind,
      notes,
    });
    return NextResponse.json({ ok: true, id: attachment.id });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("VALIDATION: ")) {
      return NextResponse.json(
        { error: err.message.replace("VALIDATION: ", "") },
        { status: 422 },
      );
    }
    if (err instanceof Error && err.message === "ENTITY_NOT_FOUND") {
      return NextResponse.json(
        { error: "La entidad asociada ya no existe." },
        { status: 404 },
      );
    }
    console.error("[files/upload]", err);
    return NextResponse.json(
      { error: "No se pudo subir el archivo. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
