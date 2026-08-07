-- Indices compuestos que cubren el filtro "deletedAt IS NULL" junto a los
-- campos por los que realmente se filtra y ordena en panel y listados.
-- Hasta ahora Postgres solo tenia indices de una sola columna (status,
-- nextActionAt, ...) y tenia que releer filas para descartar las borradas.
--
-- Solo se crean indices: ninguna sentencia altera ni borra datos.

-- CreateIndex
CREATE INDEX "CalendarEvent_deletedAt_status_startAt_idx" ON "CalendarEvent"("deletedAt", "status", "startAt");

-- CreateIndex
CREATE INDEX "Client_deletedAt_status_name_idx" ON "Client"("deletedAt", "status", "name");

-- CreateIndex
CREATE INDEX "InvoiceDraftRequest_deletedAt_status_idx" ON "InvoiceDraftRequest"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "InvoiceRecord_deletedAt_status_dueAt_idx" ON "InvoiceRecord"("deletedAt", "status", "dueAt");

-- CreateIndex
CREATE INDEX "InvoiceRecord_deletedAt_clientId_status_idx" ON "InvoiceRecord"("deletedAt", "clientId", "status");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_status_nextActionAt_idx" ON "Lead"("deletedAt", "status", "nextActionAt");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_createdAt_idx" ON "Lead"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_temperature_status_idx" ON "Lead"("deletedAt", "temperature", "status");

-- CreateIndex
CREATE INDEX "Opportunity_deletedAt_stage_idx" ON "Opportunity"("deletedAt", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_deletedAt_clientId_idx" ON "Opportunity"("deletedAt", "clientId");

-- CreateIndex
CREATE INDEX "Project_deletedAt_status_idx" ON "Project"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Project_deletedAt_clientId_status_idx" ON "Project"("deletedAt", "clientId", "status");

-- CreateIndex
CREATE INDEX "Proposal_deletedAt_status_idx" ON "Proposal"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "RecurringService_deletedAt_status_nextInvoiceAt_idx" ON "RecurringService"("deletedAt", "status", "nextInvoiceAt");

-- CreateIndex
CREATE INDEX "RecurringService_deletedAt_clientId_status_idx" ON "RecurringService"("deletedAt", "clientId", "status");

-- CreateIndex
CREATE INDEX "Task_deletedAt_status_dueAt_idx" ON "Task"("deletedAt", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_deletedAt_projectId_idx" ON "Task"("deletedAt", "projectId");

-- CreateIndex
CREATE INDEX "Task_deletedAt_clientId_idx" ON "Task"("deletedAt", "clientId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_deletedAt_startedAt_idx" ON "TimeEntry"("userId", "deletedAt", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_clientId_deletedAt_idx" ON "TimeEntry"("clientId", "deletedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_deletedAt_idx" ON "TimeEntry"("projectId", "deletedAt");
