-- CreateEnum
CREATE TYPE "TimeEntryOrigin" AS ENUM ('kairas', 'toggl');

-- CreateEnum
CREATE TYPE "TimeSyncStatus" AS ENUM ('synced', 'pending', 'error');

-- CreateEnum
CREATE TYPE "TogglSyncKind" AS ENUM ('historical_import', 'reconciliation');

-- CreateEnum
CREATE TYPE "TogglSyncRunStatus" AS ENUM ('running', 'success', 'error');

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "origin" "TimeEntryOrigin" NOT NULL DEFAULT 'kairas',
ADD COLUMN     "syncStatus" "TimeSyncStatus" NOT NULL DEFAULT 'synced',
ADD COLUMN     "togglProjectId" TEXT,
ADD COLUMN     "togglTimeEntryId" TEXT,
ADD COLUMN     "togglUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "togglWorkspaceId" TEXT;

-- CreateTable
CREATE TABLE "TogglProjectMapping" (
    "id" TEXT NOT NULL,
    "togglProjectId" TEXT NOT NULL,
    "togglProjectName" TEXT NOT NULL,
    "togglWorkspaceId" TEXT NOT NULL,
    "kairasProjectId" TEXT,
    "matchedByName" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TogglProjectMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TogglSyncRun" (
    "id" TEXT NOT NULL,
    "kind" "TogglSyncKind" NOT NULL,
    "status" "TogglSyncRunStatus" NOT NULL DEFAULT 'running',
    "windowFrom" TIMESTAMP(3),
    "windowTo" TIMESTAMP(3),
    "sinceParam" INTEGER,
    "itemsReceived" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsUnchanged" INTEGER NOT NULL DEFAULT 0,
    "itemsUnassigned" INTEGER NOT NULL DEFAULT 0,
    "itemsDeleted" INTEGER NOT NULL DEFAULT 0,
    "itemsError" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TogglSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TogglProjectMapping_togglProjectId_key" ON "TogglProjectMapping"("togglProjectId");

-- CreateIndex
CREATE INDEX "TogglProjectMapping_kairasProjectId_idx" ON "TogglProjectMapping"("kairasProjectId");

-- CreateIndex
CREATE INDEX "TogglProjectMapping_confirmedAt_idx" ON "TogglProjectMapping"("confirmedAt");

-- CreateIndex
CREATE INDEX "TogglSyncRun_kind_status_idx" ON "TogglSyncRun"("kind", "status");

-- CreateIndex
CREATE INDEX "TogglSyncRun_createdAt_idx" ON "TogglSyncRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_togglTimeEntryId_key" ON "TimeEntry"("togglTimeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntry_startedAt_idx" ON "TimeEntry"("startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_togglProjectId_idx" ON "TimeEntry"("togglProjectId");

-- CreateIndex
CREATE INDEX "TimeEntry_syncStatus_idx" ON "TimeEntry"("syncStatus");

-- AddForeignKey
ALTER TABLE "TogglProjectMapping" ADD CONSTRAINT "TogglProjectMapping_kairasProjectId_fkey" FOREIGN KEY ("kairasProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

