-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "lastSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN     "syncAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TimerSession" ADD COLUMN     "togglSyncError" TEXT,
ADD COLUMN     "togglTimeEntryId" TEXT,
ADD COLUMN     "togglWorkspaceId" TEXT;

-- CreateIndex
CREATE INDEX "TimeEntry_syncStatus_deletedAt_idx" ON "TimeEntry"("syncStatus", "deletedAt");

