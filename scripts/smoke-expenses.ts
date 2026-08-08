/**
 * Smoke test del módulo de gastos de viaje.
 * Crea datos con prefijo SMOKE y los elimina al final.
 *
 * Ejecutar: npx tsx scripts/smoke-expenses.ts
 */
import { prisma } from "@/server/db/prisma";
import { expenseSchema } from "@/server/validators/expense";
import {
  createExpense,
  updateExpense,
  listExpenses,
  getExpense,
  getExpenseFormOptions,
  softDeleteExpense,
} from "@/server/services/expense-service";
import { setSetting, getExpenseDefaults } from "@/server/services/settings-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FALLO: ${message}`);
}

const today = new Date().toISOString().slice(0, 10);

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  assert(user, "hace falta al menos una usuaria en la base");

  // Tarifas conocidas para que las cuentas sean deterministas.
  const previous = await prisma.settings.findUnique({ where: { key: "expenses.defaults" } });
  await setSetting("expenses.defaults", {
    ratePerKm: 0.26,
    perDiemDay: 26.67,
    perDiemOvernight: 53.34,
    tollSuppliers: ["beep"],
  });
  const defaults = await getExpenseDefaults();
  assert(defaults.ratePerKm === 0.26, "las tarifas se leen de Ajustes");
  console.log("✓ tarifas configuradas y leídas desde Ajustes");

  // --- validación por tipo ---
  assert(
    !expenseSchema.safeParse({
      kind: "mileage",
      description: "SMOKE sin km",
      expenseAt: today,
      originPlace: "A",
      destinationPlace: "B",
    }).success,
    "kilometraje sin km rechazado",
  );
  assert(
    !expenseSchema.safeParse({
      kind: "mileage",
      description: "SMOKE sin origen",
      expenseAt: today,
      kilometers: "50",
      destinationPlace: "B",
    }).success,
    "kilometraje sin origen rechazado",
  );
  assert(
    !expenseSchema.safeParse({
      kind: "fuel",
      description: "SMOKE sin importe",
      expenseAt: today,
    }).success,
    "gasolina sin importe rechazada",
  );
  assert(
    !expenseSchema.safeParse({
      kind: "per_diem",
      description: "SMOKE sin dias",
      expenseAt: today,
    }).success,
    "dieta sin días rechazada",
  );
  console.log("✓ validación exige lo propio de cada tipo");

  // --- kilometraje ---
  const mileage = await createExpense(
    user.id,
    expenseSchema.parse({
      kind: "mileage",
      description: "SMOKE Visita cliente",
      expenseAt: today,
      originPlace: "A Coruña",
      destinationPlace: "Santiago",
      kilometers: "75",
      roundTrip: "on",
    }),
  );
  // 75 km ida y vuelta = 150 km × 0,26 €/km = 39,00 €
  assert(Number(mileage.amountTotal) === 39, `kilometraje = 39 € (dio ${mileage.amountTotal})`);
  assert(Number(mileage.ratePerKm) === 0.26, "guarda la tarifa aplicada");
  assert(mileage.roundTrip === true, "marca ida y vuelta");
  console.log(`✓ kilometraje: 75 km ida y vuelta × 0,26 = ${mileage.amountTotal} €`);

  // Tarifa propia para ese viaje concreto.
  const custom = await createExpense(
    user.id,
    expenseSchema.parse({
      kind: "mileage",
      description: "SMOKE Tarifa propia",
      expenseAt: today,
      originPlace: "A",
      destinationPlace: "B",
      kilometers: "100",
      ratePerKm: "0.30",
    }),
  );
  assert(Number(custom.amountTotal) === 30, "la tarifa del formulario manda sobre la de Ajustes");
  console.log("✓ la tarifa indicada en el viaje sobrescribe la de Ajustes");

  // --- dietas ---
  const perDiem = await createExpense(
    user.id,
    expenseSchema.parse({
      kind: "per_diem",
      description: "SMOKE Dieta",
      expenseAt: today,
      perDiemDays: "3",
      overnight: "on",
    }),
  );
  assert(
    Number(perDiem.amountTotal) === 160.02,
    `dieta = 3 × 53,34 = 160,02 (dio ${perDiem.amountTotal})`,
  );
  console.log(`✓ dieta: 3 días con pernocta = ${perDiem.amountTotal} €`);

  // --- gasolina ---
  const fuel = await createExpense(
    user.id,
    expenseSchema.parse({
      kind: "fuel",
      description: "SMOKE Repostaje",
      expenseAt: today,
      amountNet: "50",
      vatAmount: "10.50",
      supplier: "Repsol",
    }),
  );
  assert(Number(fuel.amountTotal) === 60.5, "gasolina = base + IVA");
  assert(fuel.kilometers === null, "la gasolina no guarda kilómetros");
  console.log(`✓ gasolina: 50 + 10,50 IVA = ${fuel.amountTotal} €`);

  // Cambiar de tipo limpia los campos del tipo anterior.
  await updateExpense(
    user.id,
    mileage.id,
    expenseSchema.parse({
      kind: "fuel",
      description: "SMOKE Ahora gasolina",
      expenseAt: today,
      amountNet: "20",
    }),
  );
  const converted = await getExpense(mileage.id);
  assert(converted?.kilometers === null, "al cambiar de tipo se limpian los km");
  assert(Number(converted?.amountTotal) === 20, "recalcula el importe al cambiar de tipo");
  console.log("✓ cambiar de tipo limpia los campos que ya no aplican");

  // --- gasto importado de Odoo: no editable ---
  const imported = await prisma.expenseRecord.create({
    data: {
      kind: "toll",
      source: "odoo",
      odooMoveId: 999999,
      description: "SMOKE Peaje importado",
      supplier: "Beep&Drive",
      amountNet: 10,
      vatAmount: 2.1,
      amountTotal: 12.1,
      expenseAt: new Date(),
      userId: user.id,
    },
  });
  let blocked = false;
  try {
    await updateExpense(
      user.id,
      imported.id,
      expenseSchema.parse({
        kind: "toll",
        description: "SMOKE intento de edicion",
        expenseAt: today,
        amountNet: "999",
      }),
    );
  } catch (err) {
    blocked = err instanceof Error && err.message === "IMPORTED";
  }
  assert(blocked, "un peaje de Odoo no se puede reescribir");
  console.log("✓ los peajes importados de Odoo no son editables");

  // Reimportar el mismo movimiento no duplica.
  const again = await prisma.expenseRecord.createMany({
    data: [
      {
        kind: "toll",
        source: "odoo",
        odooMoveId: 999999,
        description: "SMOKE Peaje duplicado",
        amountTotal: 12.1,
        expenseAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });
  assert(again.count === 0, "el índice único evita duplicar el peaje");
  console.log("✓ reimportar el mismo movimiento de Odoo no duplica");

  // --- listado y métricas ---
  const { expenses, byKind, stats } = await listExpenses();
  assert(expenses.length > 0, "el listado devuelve gastos");
  assert(typeof stats.amount === "number", "los totales se calculan");
  assert(byKind.length > 0, "el reparto por tipo se calcula");
  await listExpenses({ kind: "fuel" });
  await getExpenseFormOptions();
  console.log(
    `✓ listado: ${stats.count} apuntes, ${stats.amount.toFixed(2)} € en total, ` +
      `${stats.km} km acumulados`,
  );

  // --- limpieza ---
  for (const id of [mileage.id, custom.id, perDiem.id, fuel.id]) {
    await softDeleteExpense(user.id, id);
  }
  await prisma.expenseRecord.deleteMany({ where: { description: { startsWith: "SMOKE" } } });
  await prisma.auditLog.deleteMany({ where: { entityType: "ExpenseRecord" } });
  if (previous) {
    await setSetting("expenses.defaults", previous.value);
  } else {
    await prisma.settings.deleteMany({ where: { key: "expenses.defaults" } });
  }
  console.log("✓ datos SMOKE eliminados y ajustes restaurados");

  console.log("\nTODO OK — módulo de gastos verificado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
