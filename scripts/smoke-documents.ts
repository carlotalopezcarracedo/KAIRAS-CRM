/**
 * Smoke test del archivo de documentos administrativos.
 * Crea datos con prefijo SMOKE y los elimina al final.
 *
 * Ejecutar: npx tsx scripts/smoke-documents.ts
 */
import { prisma } from "@/server/db/prisma";
import { adminDocumentSchema } from "@/server/validators/admin-document";
import {
  createAdminDocument,
  updateAdminDocument,
  listAdminDocuments,
  getAdminDocument,
  softDeleteAdminDocument,
} from "@/server/services/admin-document-service";
import { getCompanyProfile, formatFiscalAddress } from "@/server/services/settings-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALLO: ${message}`);
}

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  assert(user, "hace falta al menos una usuaria en la base");

  // --- validación ---
  assert(!adminDocumentSchema.safeParse({ title: "x" }).success, "título corto rechazado");
  assert(
    !adminDocumentSchema.safeParse({
      title: "SMOKE Seguro",
      issuedAt: isoDay(0),
      validUntil: isoDay(-30),
    }).success,
    "caducidad anterior a la emisión rechazada",
  );
  assert(
    !adminDocumentSchema.safeParse({ title: "SMOKE Modelo", fiscalYear: "1800" }).success,
    "ejercicio fuera de rango rechazado",
  );
  console.log("✓ validación rechaza input inválido");

  // --- alta de un modelo trimestral ---
  const model = await createAdminDocument(
    user.id,
    adminDocumentSchema.parse({
      title: "SMOKE Modelo 303 2T",
      category: "iva_trimestral",
      fiscalYear: "2026",
      fiscalPeriod: "2T",
      issuer: "AEAT",
      amount: "1234.56",
      issuedAt: isoDay(-10),
    }),
  );
  assert(model.fiscalYear === 2026 && model.fiscalPeriod === "2T", "guarda ejercicio y periodo");
  assert(Number(model.amount) === 1234.56, "guarda el importe");
  console.log("✓ modelo trimestral registrado con ejercicio y periodo");

  // --- documento caducado y otro que caduca pronto ---
  const expired = await createAdminDocument(
    user.id,
    adminDocumentSchema.parse({
      title: "SMOKE Certificado caducado",
      category: "certificado_digital",
      validUntil: isoDay(-5),
    }),
  );
  const soon = await createAdminDocument(
    user.id,
    adminDocumentSchema.parse({
      title: "SMOKE Seguro caduca pronto",
      category: "seguro",
      validUntil: isoDay(30),
    }),
  );
  // Fuera de la ventana de aviso: no debe aparecer.
  const far = await createAdminDocument(
    user.id,
    adminDocumentSchema.parse({
      title: "SMOKE Seguro lejano",
      category: "seguro",
      validUntil: isoDay(200),
    }),
  );

  const listed = await listAdminDocuments();
  const expiringIds = listed.expiring.map((d) => d.id);
  assert(expiringIds.includes(expired.id), "el caducado aparece en los avisos");
  assert(expiringIds.includes(soon.id), "el que caduca en 30 días aparece");
  assert(!expiringIds.includes(far.id), "el que caduca en 200 días NO aparece");
  assert(
    listed.expiring.find((d) => d.id === expired.id)?.expired === true,
    "marca como caducado el que ya pasó",
  );
  assert(
    listed.expiring.find((d) => d.id === soon.id)?.expired === false,
    "no marca como caducado el que aún no venció",
  );
  console.log(
    `✓ avisos de caducidad: ${listed.expiring.length} en ventana de 60 días, ` +
      "el lejano queda fuera",
  );

  // --- filtros ---
  assert(listed.years.includes(2026), "el ejercicio aparece en la lista de años");
  const byYear = await listAdminDocuments({ fiscalYear: 2026 });
  assert(
    byYear.documents.every((d) => d.fiscalYear === 2026),
    "el filtro por ejercicio funciona",
  );
  const byCat = await listAdminDocuments({ category: "seguro" });
  assert(
    byCat.documents.every((d) => d.category === "seguro"),
    "el filtro por categoría funciona",
  );
  console.log(
    `✓ filtros: ${byYear.documents.length} de 2026, ${byCat.documents.length} seguros`,
  );

  // --- ficha con adjuntos y edición ---
  const detail = await getAdminDocument(model.id);
  assert(detail, "la ficha se recupera");
  assert(Array.isArray(detail.files), "la ficha trae la lista de archivos");
  await updateAdminDocument(
    user.id,
    model.id,
    adminDocumentSchema.parse({
      title: "SMOKE Modelo 303 2T",
      category: "iva_trimestral",
      fiscalYear: "2026",
      fiscalPeriod: "3T",
    }),
  );
  const updated = await getAdminDocument(model.id);
  assert(updated?.document.fiscalPeriod === "3T", "la edición guarda el periodo nuevo");
  assert(updated?.document.amount === null, "un importe vacío se limpia");
  console.log("✓ ficha con adjuntos y edición correctas");

  // --- dirección fiscal ---
  const profile = await getCompanyProfile();
  assert(typeof profile.postalCode === "string", "el perfil trae los campos fiscales nuevos");
  assert(profile.country.length > 0, "el país tiene valor por defecto");
  const line = formatFiscalAddress({
    ...profile,
    address: "Rúa Real 1",
    postalCode: "15003",
    city: "A Coruña",
    province: "A Coruña",
    country: "España",
  });
  assert(
    line === "Rúa Real 1, 15003 A Coruña, A Coruña, España",
    `dirección en una línea (dio "${line}")`,
  );
  console.log(`✓ dirección fiscal compuesta: ${line}`);

  // --- limpieza ---
  for (const id of [model.id, expired.id, soon.id, far.id]) {
    await softDeleteAdminDocument(user.id, id);
  }
  await prisma.adminDocument.deleteMany({ where: { title: { startsWith: "SMOKE" } } });
  await prisma.auditLog.deleteMany({ where: { entityType: "AdminDocument" } });
  console.log("✓ datos SMOKE eliminados");

  console.log("\nTODO OK — documentos administrativos verificados");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
