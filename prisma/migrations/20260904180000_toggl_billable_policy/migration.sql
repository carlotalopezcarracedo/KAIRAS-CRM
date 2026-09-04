-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "billableLocal" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: las TimeEntry ya existentes nacidas en Kairas quedan protegidas
-- desde ya (su "billable" nunca debe pisarse desde una sincronización de
-- Toggl). Las nacidas en Toggl se quedan en false (siguen el valor remoto
-- hasta que alguien las edite desde Kairas), que ya es el DEFAULT de la
-- columna, así que no hace falta tocarlas explícitamente.
UPDATE "TimeEntry" SET "billableLocal" = true WHERE "origin" = 'kairas';
