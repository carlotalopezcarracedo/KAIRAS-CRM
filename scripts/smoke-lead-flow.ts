/**
 * Smoke test del flujo de leads a nivel de servicio.
 * Crea un lead de prueba, lo ejercita y lo elimina del todo al final.
 *
 * Ejecutar: npx tsx scripts/smoke-lead-flow.ts
 */
import { prisma } from "@/server/db/prisma";
import {
  leadCreateSchema,
  interactionCreateSchema,
} from "@/server/validators/lead";
import {
  createLead,
  listLeads,
  getLead,
  changeLeadStatus,
  addLeadInteraction,
  softDeleteLead,
} from "@/server/services/lead-service";

async function main() {
  const user = await prisma.user.findFirstOrThrow();

  // 1. Validación: input inválido debe fallar
  const bad = leadCreateSchema.safeParse({ name: "x", email: "no-es-email" });
  if (bad.success) throw new Error("FALLO: validación aceptó input inválido");
  console.log("✓ validación rechaza input inválido");

  // 2. Crear lead válido
  const input = leadCreateSchema.parse({
    name: "TEST Clínica Demo",
    phone: "+34600111222",
    email: "test@demo.com",
    source: "instagram_inbound",
    temperature: "hot",
    painDetected: "Pierden citas por no responder WhatsApp",
    estimatedBudget: "1500",
    nextAction: "Enviar propuesta",
    nextActionAt: "2026-07-05T10:00",
  });
  const lead = await createLead(user.id, input);
  console.log("✓ lead creado:", lead.id, "-", lead.name);

  // 3. Listado con filtros
  const list = await listLeads({
    q: "TEST Clínica",
    temperature: "hot",
    status: undefined,
    source: undefined,
  });
  if (!list.find((l) => l.id === lead.id))
    throw new Error("FALLO: no aparece en listado filtrado");
  console.log("✓ aparece en listado con filtros (q + temperatura)");

  // 4. Interacción
  const it = interactionCreateSchema.parse({
    channel: "whatsapp",
    direction: "outbound",
    summary: "Primer mensaje enviado",
    nextAction: "Llamar mañana",
    nextActionAt: "2026-07-06T09:30",
  });
  await addLeadInteraction(user.id, lead.id, it);
  const after = await getLead(lead.id);
  if (after?.interactions.length !== 1)
    throw new Error("FALLO: interacción no registrada");
  if (!after.lastContactAt) throw new Error("FALLO: lastContactAt no actualizado");
  if (after.nextAction !== "Llamar mañana")
    throw new Error("FALLO: nextAction no actualizado");
  console.log("✓ interacción registrada y seguimiento actualizado");

  // 5. Cambio de estado
  await changeLeadStatus(user.id, lead.id, "contacted");
  const contacted = await prisma.lead.findUnique({ where: { id: lead.id } });
  if (contacted?.status !== "contacted") throw new Error("FALLO: estado no cambió");
  if (!contacted.firstContactAt)
    throw new Error("FALLO: firstContactAt no fijado");
  console.log("✓ cambio de estado + firstContactAt");

  // 6. Audit log
  const audits = await prisma.auditLog.findMany({
    where: {
      actorId: user.id,
      OR: [{ entityId: lead.id }, { entityType: "Interaction" }],
    },
  });
  if (audits.length < 3) throw new Error("FALLO: faltan entradas de audit log");
  console.log(`✓ audit log: ${audits.length} entradas`);

  // 7. Borrado suave
  await softDeleteLead(user.id, lead.id);
  const deleted = await prisma.lead.findUnique({ where: { id: lead.id } });
  if (!deleted?.deletedAt) throw new Error("FALLO: soft delete no aplicado");
  const listAfter = await listLeads({
    q: "TEST Clínica",
    status: undefined,
    temperature: undefined,
    source: undefined,
  });
  if (listAfter.find((l) => l.id === lead.id))
    throw new Error("FALLO: lead borrado sigue en listado");
  console.log("✓ borrado suave: fuera de listados, recuperable en BD");

  // Limpieza total de los datos de prueba
  await prisma.interaction.deleteMany({ where: { leadId: lead.id } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ entityId: lead.id }, ...audits.map((a) => ({ id: a.id }))] },
  });
  await prisma.lead.delete({ where: { id: lead.id } });
  console.log("✓ datos de prueba eliminados");
  console.log("\nTODO OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
