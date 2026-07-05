/**
 * Smoke test del módulo de archivos adjuntos (a nivel de servicio, con el
 * driver de storage activo — local en desarrollo).
 * Crea un cliente SMOKE, sube/valida/lista/borra archivos y limpia todo.
 * Ejecutar: npx tsx scripts/smoke-files.ts
 */
import { prisma } from "@/server/db/prisma";
import {
  uploadAttachment,
  addExternalLink,
  listAttachments,
  deleteAttachment,
} from "@/server/services/attachment-service";
import { getStorage, validateFile } from "@/integrations/storage/adapter";

async function main() {
  const user = await prisma.user.findFirstOrThrow();
  const client = await prisma.client.create({
    data: { name: "SMOKE Cliente Archivos" },
  });

  try {
    // 1. Validación de tipo
    const badType = validateFile("virus.exe", "application/x-msdownload", 100);
    if (badType.ok) throw new Error("FALLO: aceptó .exe");
    console.log("✓ validación rechaza tipos no permitidos (.exe)");

    // 2. Validación de tamaño
    const tooBig = validateFile("grande.pdf", "application/pdf", 50 * 1024 * 1024);
    if (tooBig.ok) throw new Error("FALLO: aceptó archivo de 50MB");
    console.log("✓ validación rechaza archivos demasiado grandes");

    // 3. Subida real (PDF mínimo válido)
    const pdfBytes = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
    );
    const uploaded = await uploadAttachment({
      userId: user.id,
      entityType: "client",
      entityId: client.id,
      fileName: "SMOKE propuesta.pdf",
      mimeType: "application/pdf",
      data: pdfBytes,
      kind: "proposal",
      notes: "smoke test",
    });
    if (!uploaded.storageKey) throw new Error("FALLO: sin storageKey");
    console.log(`✓ archivo subido (driver: ${getStorage().name})`);

    // 4. El binario NO está en la fila de BD y la clave es opaca
    if (uploaded.storageKey.includes("propuesta"))
      throw new Error("FALLO: la clave de storage filtra el nombre original");
    console.log("✓ clave de storage opaca (no filtra el nombre)");

    // 5. Lectura del contenido desde el storage (driver local)
    if (getStorage().name === "local") {
      const read = await getStorage().read(uploaded.storageKey);
      if (!read.equals(pdfBytes)) throw new Error("FALLO: contenido no coincide");
      console.log("✓ contenido recuperado íntegro del storage");
    }

    // 6. Enlace externo
    await addExternalLink({
      userId: user.id,
      entityType: "client",
      entityId: client.id,
      name: "SMOKE Drive",
      url: "https://drive.google.com/ejemplo",
      kind: "client_doc",
    });

    // 7. Listado
    const list = await listAttachments("client", client.id);
    if (list.length !== 2) throw new Error(`FALLO: ${list.length} adjuntos (esperados 2)`);
    console.log("✓ listado por entidad: archivo + enlace externo");

    // 8. Entidad inexistente → rechazo
    let rejected = false;
    try {
      await uploadAttachment({
        userId: user.id,
        entityType: "client",
        entityId: "no-existe",
        fileName: "x.pdf",
        mimeType: "application/pdf",
        data: pdfBytes,
        kind: "other",
      });
    } catch (err) {
      rejected = err instanceof Error && err.message === "ENTITY_NOT_FOUND";
    }
    if (!rejected) throw new Error("FALLO: aceptó adjunto sobre entidad inexistente");
    console.log("✓ rechaza adjuntos sobre entidades inexistentes");

    // 9. Borrado: soft-delete de metadata + binario eliminado del storage
    const key = uploaded.storageKey;
    await deleteAttachment(user.id, uploaded.id);
    const afterDelete = await listAttachments("client", client.id);
    if (afterDelete.length !== 1) throw new Error("FALLO: sigue listado tras borrar");
    if (getStorage().name === "local") {
      let gone = false;
      try {
        await getStorage().read(key);
      } catch {
        gone = true;
      }
      if (!gone) throw new Error("FALLO: el binario sigue en el storage");
      console.log("✓ borrado: metadata archivada y binario eliminado");
    }

    // 10. Audit log (solo de los adjuntos de este test)
    const smokeAttachmentIds = (
      await prisma.attachment.findMany({
        where: { entityId: client.id },
        select: { id: true },
      })
    ).map((a) => a.id);
    const audits = await prisma.auditLog.count({
      where: { entityType: "Attachment", entityId: { in: smokeAttachmentIds } },
    });
    if (audits < 3) throw new Error("FALLO: faltan entradas de audit");
    console.log("✓ audit log de subida/enlace/borrado");

    console.log("\nTODO OK — módulo de archivos verificado");
  } finally {
    // Limpieza ESTRICTA: solo lo creado por este test (nunca tocar datos reales)
    const leftovers = await prisma.attachment.findMany({
      where: { entityId: client.id },
    });
    for (const a of leftovers) {
      if (a.storageKey) await getStorage().delete(a.storageKey).catch(() => {});
    }
    await prisma.auditLog.deleteMany({
      where: {
        entityType: "Attachment",
        entityId: { in: leftovers.map((a) => a.id) },
      },
    });
    await prisma.attachment.deleteMany({ where: { entityId: client.id } });
    await prisma.client.delete({ where: { id: client.id } });
    console.log("✓ datos SMOKE eliminados");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
