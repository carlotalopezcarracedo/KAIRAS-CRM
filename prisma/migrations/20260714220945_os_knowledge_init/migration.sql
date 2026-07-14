-- CreateEnum
CREATE TYPE "OsEntryType" AS ENUM ('principio', 'regla', 'prohibicion', 'definicion', 'posicionamiento', 'icp', 'oferta', 'precio', 'garantia', 'claim', 'mensaje', 'objecion', 'cta', 'guion', 'caso', 'pilar_contenido', 'serie_contenido', 'pieza_contenido', 'hipotesis', 'experimento', 'aprendizaje', 'decision', 'riesgo', 'playbook', 'recurso', 'regla_marca', 'token_visual', 'kpi', 'articulo_constitucion');

-- CreateEnum
CREATE TYPE "OsStatus" AS ENUM ('borrador', 'vigente', 'provisional', 'condicionado', 'validado', 'historico', 'obsoleto', 'archivado');

-- CreateEnum
CREATE TYPE "OsAuthority" AS ENUM ('constitucion', 'sistema_permanente', 'operativo', 'experimental', 'historico');

-- CreateEnum
CREATE TYPE "OsBusinessLine" AS ENUM ('L1_automatizacion', 'L2_web', 'L3_branding', 'transversal');

-- CreateEnum
CREATE TYPE "OsMessageLayer" AS ENUM ('corp', 'sect', 'prod', 'conv', 'prop', 'na');

-- CreateEnum
CREATE TYPE "OsRelationType" AS ENUM ('desarrolla', 'sustituye', 'depende_de', 'valida', 'refuta', 'prueba', 'responde', 'aplica', 'deriva_en', 'relacionado');

-- CreateTable
CREATE TABLE "os_knowledge_source" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phase" TEXT,
    "path" TEXT,
    "kind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_entry" (
    "id" TEXT NOT NULL,
    "externalKey" TEXT,
    "type" "OsEntryType" NOT NULL,
    "area" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "summary" TEXT,
    "status" "OsStatus" NOT NULL DEFAULT 'borrador',
    "authority" "OsAuthority" NOT NULL DEFAULT 'operativo',
    "businessLine" "OsBusinessLine" NOT NULL DEFAULT 'transversal',
    "messageLayer" "OsMessageLayer" NOT NULL DEFAULT 'na',
    "sector" TEXT,
    "hypothesisRef" TEXT,
    "funnelStage" TEXT,
    "awarenessLevel" TEXT,
    "temperature" TEXT,
    "channel" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "meta" JSONB,
    "embeddingRef" TEXT,
    "contentHash" TEXT,
    "ownerId" TEXT,
    "sourceId" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "os_knowledge_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "os_knowledge_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_entry_tag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "os_knowledge_entry_tag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "os_knowledge_relation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "OsRelationType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_version" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "bodySnapshot" TEXT,
    "statusSnapshot" "OsStatus" NOT NULL,
    "changeReason" TEXT,
    "authorId" TEXT,
    "supersedesEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_favorite" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_knowledge_permission" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "os_knowledge_entry_externalKey_key" ON "os_knowledge_entry"("externalKey");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_type_status_idx" ON "os_knowledge_entry"("type", "status");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_area_idx" ON "os_knowledge_entry"("area");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_authority_idx" ON "os_knowledge_entry"("authority");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_sector_idx" ON "os_knowledge_entry"("sector");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_targetType_targetId_idx" ON "os_knowledge_entry"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_updatedAt_idx" ON "os_knowledge_entry"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "os_knowledge_tag_slug_key" ON "os_knowledge_tag"("slug");

-- CreateIndex
CREATE INDEX "os_knowledge_entry_tag_tagId_idx" ON "os_knowledge_entry_tag"("tagId");

-- CreateIndex
CREATE INDEX "os_knowledge_relation_toId_idx" ON "os_knowledge_relation"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "os_knowledge_relation_fromId_toId_type_key" ON "os_knowledge_relation"("fromId", "toId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "os_knowledge_version_entryId_version_key" ON "os_knowledge_version"("entryId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "os_knowledge_favorite_entryId_userId_key" ON "os_knowledge_favorite"("entryId", "userId");

-- AddForeignKey
ALTER TABLE "os_knowledge_entry" ADD CONSTRAINT "os_knowledge_entry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "os_knowledge_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_entry_tag" ADD CONSTRAINT "os_knowledge_entry_tag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_entry_tag" ADD CONSTRAINT "os_knowledge_entry_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "os_knowledge_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_relation" ADD CONSTRAINT "os_knowledge_relation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_relation" ADD CONSTRAINT "os_knowledge_relation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_version" ADD CONSTRAINT "os_knowledge_version_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_knowledge_favorite" ADD CONSTRAINT "os_knowledge_favorite_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

