/**
 * Smoke test de los módulos de propuestas y campañas.
 * Crea datos con prefijo SMOKE y los elimina al final.
 *
 * Ejecutar: npx tsx scripts/smoke-proposals-campaigns.ts
 */
import { prisma } from "@/server/db/prisma";
import { proposalSchema } from "@/server/validators/proposal";
import { campaignSchema } from "@/server/validators/campaign";
import {
  listProposals,
  getProposal,
  getProposalFormOptions,
  createProposal,
  updateProposal,
  setProposalStatus,
  createProposalVersion,
  softDeleteProposal,
} from "@/server/services/proposal-service";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  softDeleteCampaign,
} from "@/server/services/campaign-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALLO: ${message}`);
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  assert(user, "hace falta al menos una usuaria en la base");

  // --- validación ---
  assert(!proposalSchema.safeParse({ title: "x" }).success, "título corto rechazado");
  assert(
    !proposalSchema.safeParse({ title: "SMOKE prop", status: "rejected" }).success,
    "rechazo sin motivo rechazado",
  );
  assert(
    !campaignSchema.safeParse({
      name: "SMOKE camp",
      startAt: "2026-06-01",
      endAt: "2026-01-01",
    }).success,
    "fin anterior al inicio rechazado",
  );
  console.log("✓ validación rechaza input inválido");

  // --- propuestas ---
  const parsed = proposalSchema.parse({
    title: "SMOKE Propuesta web",
    status: "draft",
    amountNet: "1000",
    vatRate: "21",
  });
  const proposal = await createProposal(user.id, parsed);
  assert(Number(proposal.amountTotal) === 1210, "total con IVA calculado (1210)");
  console.log(`✓ propuesta creada, total con IVA = ${proposal.amountTotal}`);

  await updateProposal(
    user.id,
    proposal.id,
    proposalSchema.parse({
      title: "SMOKE Propuesta web",
      status: "sent",
      amountNet: "2000",
      vatRate: "10",
    }),
  );
  const afterUpdate = await getProposal(proposal.id);
  assert(Number(afterUpdate?.amountTotal) === 2200, "total recalculado (2200)");
  assert(afterUpdate?.sentAt !== null, "sentAt se rellena al pasar a enviada");
  console.log("✓ actualización recalcula IVA y sella la fecha de envío");

  const accepted = await setProposalStatus(user.id, proposal.id, "accepted");
  assert(accepted.acceptedAt !== null, "acceptedAt se rellena al aceptar");
  console.log("✓ cambio de estado sella acceptedAt");

  const v2 = await createProposalVersion(user.id, proposal.id);
  assert(v2.version === 2, "la nueva versión es la 2");
  const archived = await prisma.proposal.findUnique({ where: { id: proposal.id } });
  assert(archived?.status === "archived", "la anterior queda archivada");
  console.log("✓ versionado: v2 creada y v1 archivada");

  const listed = await listProposals();
  assert(listed.proposals.length > 0, "el listado devuelve propuestas");
  assert(typeof listed.stats.winRate === "number", "las métricas se calculan");
  await listProposals({ status: "open" });
  await listProposals({ q: "SMOKE" });
  await getProposalFormOptions();
  console.log(
    `✓ listado y filtros: ${listed.proposals.length} propuestas, ` +
      `tasa de aceptación ${listed.stats.winRate}%`,
  );

  // --- campañas ---
  const campaign = await createCampaign(
    user.id,
    campaignSchema.parse({
      name: "SMOKE Meta Ads",
      channel: "facebook_ads",
      status: "active",
      budget: "1000",
      spent: "500",
    }),
  );
  console.log("✓ campaña creada");

  await updateCampaign(
    user.id,
    campaign.id,
    campaignSchema.parse({
      name: "SMOKE Meta Ads",
      channel: "facebook_ads",
      status: "active",
      budget: "1000",
      spent: "800",
    }),
  );

  const campaignList = await listCampaigns();
  const row = campaignList.campaigns.find((c) => c.id === campaign.id);
  assert(row, "la campaña aparece en el listado");
  assert(row.spentAmount === 800, "el gasto se actualiza");
  assert(row.budgetUsedPct === 80, "el % de presupuesto se calcula (80)");
  assert(row.roas === 0, "sin ventas atribuidas el ROAS es 0");
  await listCampaigns({ status: "active" });
  await getCampaign(campaign.id);
  console.log(
    `✓ listado con atribución: ${row.leadsCount} leads, ` +
      `${row.budgetUsedPct}% del presupuesto, ROAS ${row.roas}`,
  );

  // --- limpieza ---
  await softDeleteProposal(user.id, v2.id);
  await softDeleteCampaign(user.id, campaign.id);
  await prisma.proposal.deleteMany({ where: { title: { startsWith: "SMOKE" } } });
  await prisma.campaign.deleteMany({ where: { name: { startsWith: "SMOKE" } } });
  await prisma.auditLog.deleteMany({
    where: { entityType: { in: ["Proposal", "Campaign"] }, entityId: { in: [proposal.id, v2.id, campaign.id] } },
  });
  console.log("✓ datos SMOKE eliminados");

  console.log("\nTODO OK — propuestas y campañas verificadas");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
