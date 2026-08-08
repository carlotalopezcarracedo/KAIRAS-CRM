-- Modulo de gastos de viaje: desplazamiento por km, gasolina, peajes y dietas.
--
-- Amplia ExpenseRecord, que hasta ahora era un modelo generico sin usar.
-- Solo se anaden tipos, columnas e indices: ninguna sentencia borra ni
-- transforma datos existentes, y toda columna NOT NULL lleva DEFAULT, asi
-- que la migracion es segura aunque la tabla tuviera filas.

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('mileage', 'fuel', 'toll', 'per_diem', 'other');

-- CreateEnum
CREATE TYPE "ExpenseSource" AS ENUM ('manual', 'odoo');

-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "destinationPlace" TEXT,
ADD COLUMN     "kilometers" DECIMAL(10,2),
ADD COLUMN     "kind" "ExpenseKind" NOT NULL DEFAULT 'other',
ADD COLUMN     "odooMoveId" INTEGER,
ADD COLUMN     "originPlace" TEXT,
ADD COLUMN     "overnight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perDiemDays" INTEGER,
ADD COLUMN     "ratePerKm" DECIMAL(6,3),
ADD COLUMN     "roundTrip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "ExpenseSource" NOT NULL DEFAULT 'manual',
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseRecord_deletedAt_expenseAt_idx" ON "ExpenseRecord"("deletedAt", "expenseAt");

-- CreateIndex
CREATE INDEX "ExpenseRecord_deletedAt_kind_expenseAt_idx" ON "ExpenseRecord"("deletedAt", "kind", "expenseAt");

-- CreateIndex
CREATE INDEX "ExpenseRecord_deletedAt_projectId_idx" ON "ExpenseRecord"("deletedAt", "projectId");

-- CreateIndex
CREATE INDEX "ExpenseRecord_deletedAt_clientId_idx" ON "ExpenseRecord"("deletedAt", "clientId");

-- CreateIndex
-- Clave de deduplicacion: reimportar el mismo mes de Odoo no duplica peajes.
CREATE UNIQUE INDEX "ExpenseRecord_odooMoveId_key" ON "ExpenseRecord"("odooMoveId");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
