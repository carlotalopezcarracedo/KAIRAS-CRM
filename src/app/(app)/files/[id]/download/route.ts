import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getAttachmentForDownload } from "@/server/services/attachment-service";
import { getStorage } from "@/integrations/storage/adapter";

/**
 * Descarga autenticada. Nunca hay URLs públicas permanentes:
 * - driver supabase → redirect a URL firmada (5 min);
 * - driver local → streaming directo con Content-Disposition: attachment.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizada" }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await getAttachmentForDownload(id);
  if (!attachment) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }

  // Enlace externo: redirigir tal cual
  if (!attachment.storageKey && attachment.url) {
    return NextResponse.redirect(attachment.url);
  }
  if (!attachment.storageKey) {
    return NextResponse.json({ error: "Archivo sin contenido." }, { status: 410 });
  }

  const storage = getStorage();
  try {
    const signedUrl = await storage.getSignedUrl(attachment.storageKey, 300);
    if (signedUrl) return NextResponse.redirect(signedUrl);

    // Driver local: streaming
    const data = await storage.read(attachment.storageKey);
    const safeName = attachment.name.replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_");
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": attachment.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(data.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[files/download]", err);
    return NextResponse.json(
      { error: "No se pudo recuperar el archivo." },
      { status: 500 },
    );
  }
}
