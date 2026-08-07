/**
 * Diagnostico: ejecuta la consulta del panel tal cual la hace la pagina,
 * para ver el error real que la interfaz esconde tras "Error temporal".
 *
 * Ejecutar: npx tsx scripts/diag-dashboard.ts
 */
import { prisma } from "@/server/db/prisma";
import { getDashboardData } from "@/server/services/dashboard-service";

async function main() {
  const raw = process.env.DATABASE_URL ?? "(sin definir)";
  let host = "?";
  try {
    host = new URL(raw).host;
  } catch {
    /* URL no estandar */
  }
  console.log(`base de datos: ${host}\n`);

  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) {
    console.log("No hay usuarias en la base. El panel no puede cargar sin sesion.");
    return;
  }
  console.log(`usuaria: ${user.email}`);

  try {
    const data = await getDashboardData(user.id);
    console.log("\nOK, el panel carga. Resumen:");
    console.log(`  leads nuevos 7d      : ${data.leadsNew7d}`);
    console.log(`  seguimientos         : ${data.followUps.length}`);
    console.log(`  oportunidades abiertas: ${data.openOpportunitiesCount}`);
    console.log(`  proyectos activos    : ${data.activeProjectsCount}`);
    console.log(`  tareas vencidas      : ${data.overdueTasks.length}`);
    console.log(`  MRR                  : ${data.mrr}`);
    console.log(`  horas semana (s)     : ${data.week.totalSeconds}`);
  } catch (error) {
    console.log("\nFALLA. Error real:\n");
    console.log(error);
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
