-- CreateTable
CREATE TABLE "os_knowledge_view" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_knowledge_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "os_knowledge_view_entryId_idx" ON "os_knowledge_view"("entryId");

-- CreateIndex
CREATE INDEX "os_knowledge_view_viewedAt_idx" ON "os_knowledge_view"("viewedAt");

-- AddForeignKey
ALTER TABLE "os_knowledge_view" ADD CONSTRAINT "os_knowledge_view_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "os_knowledge_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

