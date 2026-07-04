/**
 * Smoke test del flujo operativo completo:
 * lead → oportunidad → ganada → cliente → proyecto → tarea → cronómetro →
 * entrada de tiempo → aprobación → solicitud de factura desde horas →
 * factura registrada → cobrada → eventos Meta en cola.
 *
 * Crea datos de prueba con prefijo "SMOKE" y los elimina al final.
 * Ejecutar: npx tsx scripts/smoke-operations.ts
 */
import { prisma } from "@/server/db/prisma";
import { leadCreateSchema } from "@/server/validators/lead";
import { createLead } from "@/server/services/lead-service";
import { opportunityCreateSchema } from "@/server/validators/opportunity";
import {
  createOpportunity,
  changeOpportunityStage,
} from "@/server/services/opportunity-service";
import { convertLeadToClient } from "@/server/services/client-service";
import { projectCreateSchema } from "@/server/validators/project";
import { createProject, getProjectFull } from "@/server/services/project-service";
import { taskCreateSchema } from "@/server/validators/task";
import { createTask, setTaskStatus } from "@/server/services/task-service";
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  setEntryStatus,
} from "@/server/services/time-service";
import {
  createDraftFromHours,
  createRecord,
  setRecordStatus,
  getApprovedHoursForClient,
} from "@/server/services/invoice-service";
import { invoiceRecordSchema } from "@/server/validators/invoice";
import { resolveHourlyRate } from "@/server/services/rate-service";

async function main() {
  const user = await prisma.user.findFirstOrThrow();
  const uid = user.id;

  // 1. Lead
  const lead = await createLead(
    uid,
    leadCreateSchema.parse({
      name: "SMOKE Peluquería Prueba",
      phone: "+34611222333",
      email: "smoke@prueba.com",
      source: "meta_ads",
      temperature: "hot",
      consentStatus: "legitimate_interest",
    }),
  );
  console.log("✓ lead creado");

  // 2. Oportunidad desde lead → ganada
  const opp = await createOpportunity(
    uid,
    opportunityCreateSchema.parse({
      title: "SMOKE Bot de citas",
      leadId: lead.id,
      estimatedValue: "900",
      probability: "60",
    }),
  );
  await changeOpportunityStage(uid, opp.id, {
    stage: "won",
    acceptedValue: 900,
    lostReason: undefined,
  });
  const wonLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
  if (wonLead.status !== "won") throw new Error("FALLO: lead no marcado ganado");
  console.log("✓ oportunidad ganada → lead ganado");

  // 3. Convertir a cliente
  const { clientId } = await convertLeadToClient(uid, lead.id);
  const oppAfter = await prisma.opportunity.findUniqueOrThrow({ where: { id: opp.id } });
  if (oppAfter.clientId !== clientId)
    throw new Error("FALLO: oportunidad no vinculada al cliente");
  console.log("✓ lead convertido en cliente (oportunidades vinculadas)");

  // 4. Proyecto
  const project = await createProject(
    uid,
    projectCreateSchema.parse({
      name: "SMOKE Implantación bot",
      clientId,
      billingMode: "hourly",
      budget: "900",
    }),
  );
  console.log("✓ proyecto creado");

  // 5. Tarea
  const task = await createTask(
    uid,
    taskCreateSchema.parse({
      title: "SMOKE Configurar flujos",
      projectId: project.id,
      clientId,
      billable: "on",
      checklist: "Diseñar flujo\nProbar con cliente",
    }),
  );
  console.log("✓ tarea creada con checklist");

  // 6. Cronómetro: iniciar → solo una sesión → parar
  await startTimer(uid, {
    title: "SMOKE trabajo",
    taskId: task.id,
    workType: "automation",
    billable: true,
  });
  await startTimer(uid, {
    title: "SMOKE trabajo 2",
    taskId: task.id,
    workType: "automation",
    billable: true,
  }); // debe auto-parar el anterior
  const sessions = await prisma.timerSession.count({ where: { userId: uid, active: true } });
  if (sessions !== 1) throw new Error(`FALLO: ${sessions} sesiones activas (esperada 1)`);
  await new Promise((r) => setTimeout(r, 1100));
  const entry = await stopTimer(uid);
  if (await getActiveTimer(uid)) throw new Error("FALLO: timer sigue activo tras parar");
  if (entry.clientId !== clientId || entry.projectId !== project.id)
    throw new Error("FALLO: entrada sin cliente/proyecto derivados de la tarea");
  console.log("✓ cronómetro: sesión única, auto-stop, entrada con asociaciones");

  // 7. Tarifa aplicada
  const rate = await resolveHourlyRate({ projectId: project.id, clientId });
  if (rate.source !== "global") throw new Error("FALLO: tarifa no resuelta a global");
  console.log(`✓ tarifa resuelta: ${rate.rate} €/h (${rate.source})`);

  // 8. Aprobar horas → solicitud de factura desde horas
  const firstEntry = await prisma.timeEntry.findFirstOrThrow({
    where: { userId: uid, clientId, title: "SMOKE trabajo" },
  });
  await setEntryStatus(uid, firstEntry.id, "approved");
  await setEntryStatus(uid, entry.id, "approved");
  const approved = await getApprovedHoursForClient(clientId);
  if (approved.entries.length !== 2)
    throw new Error(`FALLO: ${approved.entries.length} aprobadas (esperadas 2)`);
  const draft = await createDraftFromHours(uid, {
    clientId,
    concept: "SMOKE horas julio",
    vatRate: 21,
  });
  const queuedEntry = await prisma.timeEntry.findUniqueOrThrow({
    where: { id: entry.id },
  });
  if (queuedEntry.status !== "queued_for_invoice")
    throw new Error("FALLO: entrada no en cola de factura");
  console.log("✓ solicitud de factura creada desde horas aprobadas");

  // 9. Registrar factura vinculada → cobrada
  const record = await createRecord(
    uid,
    invoiceRecordSchema.parse({
      concept: "SMOKE factura",
      clientId,
      odooInvoiceNumber: "SMOKE/2026/001",
      amountTotal: String(Number(draft.amountTotal)),
      status: "created_in_odoo",
    }),
    draft.id,
  );
  const invoicedEntry = await prisma.timeEntry.findUniqueOrThrow({
    where: { id: entry.id },
  });
  if (invoicedEntry.status !== "invoiced" || !invoicedEntry.lockedAt)
    throw new Error("FALLO: entrada no bloqueada como facturada");
  await setRecordStatus(uid, record.id, "paid");
  console.log("✓ factura registrada, horas bloqueadas, marcada cobrada");

  // 10. Proyecto: horas y rentabilidad
  const full = await getProjectFull(project.id);
  if (!full || full.totalSeconds <= 0)
    throw new Error("FALLO: proyecto sin horas agregadas");
  console.log(
    `✓ proyecto: ${full.totalSeconds}s registrados, rentabilidad ${full.profitability}%`,
  );

  // 11. Tarea completada
  await setTaskStatus(uid, task.id, "done");

  // 12. Eventos Meta en cola (lead_created, deal_won, invoice_paid, ...)
  const metaEvents = await prisma.metaEventLog.findMany({
    where: { leadId: lead.id },
  });
  const eventNames = metaEvents.map((e) => e.internalEvent);
  for (const expected of ["lead_created", "deal_won", "invoice_paid"] as const) {
    if (!eventNames.includes(expected))
      throw new Error(`FALLO: falta evento Meta ${expected}`);
  }
  const sent = metaEvents.filter((e) => e.status === "sent").length;
  if (sent > 0) throw new Error("FALLO: se enviaron eventos sin credenciales");
  console.log(
    `✓ eventos Meta registrados sin enviar: ${eventNames.join(", ")}`,
  );

  // Limpieza
  await prisma.metaEventLog.deleteMany({ where: { leadId: lead.id } });
  await prisma.timeEntry.deleteMany({ where: { clientId } });
  await prisma.invoiceDraftRequest.deleteMany({ where: { clientId } });
  await prisma.invoiceRecord.deleteMany({ where: { clientId } });
  await prisma.task.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.opportunity.delete({ where: { id: opp.id } });
  await prisma.lead.delete({ where: { id: lead.id } });
  await prisma.client.delete({ where: { id: clientId } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityId: { in: [lead.id, opp.id, project.id, task.id, clientId, draft.id, record.id, entry.id, firstEntry.id] } },
        { metadata: { path: ["clientId"], equals: clientId } },
      ],
    },
  }).catch(() => prisma.auditLog.deleteMany({ where: { entityId: lead.id } }));
  console.log("✓ datos SMOKE eliminados");

  console.log("\nTODO OK — flujo operativo completo verificado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
