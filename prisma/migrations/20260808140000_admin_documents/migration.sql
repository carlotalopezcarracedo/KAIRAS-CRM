-- Archivo de documentacion administrativa de la actividad (modelos de
-- Hacienda, RETA, seguros, certificado digital, contratos...).
--
-- Tabla nueva y un tipo nuevo: no toca nada existente.
-- El fichero en si va por Attachment con entityType = 'admin_document', para
-- reutilizar el almacenamiento, las URLs firmadas y el borrado suave.

-- CreateEnum
CREATE TYPE "AdminDocCategory" AS ENUM ('alta_censal', 'reta', 'irpf_trimestral', 'iva_trimestral', 'iva_anual', 'retenciones', 'resumen_anual', 'renta', 'seguro', 'contrato', 'certificado_digital', 'banco', 'subvencion', 'licencia', 'otro');

-- CreateTable
CREATE TABLE "AdminDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "AdminDocCategory" NOT NULL DEFAULT 'otro',
    "fiscalYear" INTEGER,
    "fiscalPeriod" TEXT,
    "issuer" TEXT,
    "reference" TEXT,
    "amount" DECIMAL(12,2),
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdminDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminDocument_deletedAt_category_fiscalYear_idx" ON "AdminDocument"("deletedAt", "category", "fiscalYear");

-- CreateIndex
CREATE INDEX "AdminDocument_deletedAt_validUntil_idx" ON "AdminDocument"("deletedAt", "validUntil");

-- CreateIndex
CREATE INDEX "AdminDocument_deletedAt_fiscalYear_idx" ON "AdminDocument"("deletedAt", "fiscalYear");
