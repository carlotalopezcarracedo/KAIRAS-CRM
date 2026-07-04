-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'responded', 'interested', 'meeting_scheduled', 'diagnosis_done', 'proposal_needed', 'proposal_sent', 'follow_up', 'negotiation', 'won', 'lost', 'nurture', 'client_active', 'client_inactive', 'do_not_contact');

-- CreateEnum
CREATE TYPE "Temperature" AS ENUM ('cold', 'warm', 'hot', 'urgent');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('instagram_cold', 'instagram_inbound', 'meta_ads', 'website', 'whatsapp', 'referral', 'door_to_door', 'cold_call', 'email', 'linkedin', 'existing_client', 'networking', 'other');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('unknown', 'legitimate_interest', 'explicit_consent', 'withdrawn', 'do_not_contact');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('discovered', 'qualified', 'diagnosis', 'proposal_drafting', 'proposal_sent', 'follow_up', 'negotiation', 'accepted', 'won', 'lost', 'paused');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('active', 'paused', 'completed', 'recurring', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('automation_ai', 'custom_software', 'website', 'website_maintenance', 'social_media_management', 'content_creation', 'meta_ads', 'marketing_strategy', 'branding_naming', 'consulting', 'audiovisual', 'other');

-- CreateEnum
CREATE TYPE "BillingUnit" AS ENUM ('project', 'hour', 'month', 'piece', 'other');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('draft', 'sent', 'viewed', 'followed_up', 'accepted', 'rejected', 'expired', 'archived');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('not_started', 'discovery', 'planning', 'design', 'development', 'review', 'delivery', 'support', 'blocked', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('follow_up', 'call', 'meeting', 'proposal', 'invoice', 'delivery', 'review', 'content', 'admin', 'technical', 'other');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'waiting', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('call', 'whatsapp', 'email', 'instagram', 'linkedin', 'meeting', 'video_call', 'in_person', 'website_form', 'other');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('outbound', 'inbound');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('active', 'paused', 'cancelled', 'ended', 'trial');

-- CreateEnum
CREATE TYPE "Periodicity" AS ENUM ('monthly', 'quarterly', 'yearly', 'weekly', 'custom');

-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('draft', 'reviewed', 'approved', 'queued_for_invoice', 'invoiced', 'non_billable', 'written_off');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('strategy', 'sales', 'meeting', 'proposal', 'web_design', 'web_development', 'automation', 'ai_development', 'crm_system', 'debugging', 'content_planning', 'copywriting', 'design', 'video_editing', 'social_media', 'meta_ads', 'admin', 'accounting', 'learning', 'internal', 'other');

-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('timer', 'manual', 'manual_import', 'toggl_import', 'clockify_import');

-- CreateEnum
CREATE TYPE "RateScope" AS ENUM ('global', 'client', 'project', 'service');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('meeting', 'call', 'task', 'deadline', 'follow_up', 'delivery', 'time_block', 'personal', 'other');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('scheduled', 'confirmed', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft_needed', 'queued_for_odoo', 'created_in_odoo', 'sent', 'paid', 'overdue', 'cancelled', 'error');

-- CreateEnum
CREATE TYPE "InvoiceOrigin" AS ENUM ('manual', 'odoo_api', 'odoo_csv', 'playwright', 'imported_pdf');

-- CreateEnum
CREATE TYPE "InvoiceDraftStatus" AS ENUM ('pending', 'queued', 'sent_to_odoo', 'created_in_odoo', 'error', 'discarded');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('instagram_organic', 'instagram_ads', 'facebook_ads', 'linkedin', 'website', 'whatsapp', 'door_to_door', 'cold_call', 'referral', 'email', 'other');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'finished', 'archived');

-- CreateEnum
CREATE TYPE "MetaEventName" AS ENUM ('lead_created', 'lead_contacted', 'meeting_scheduled', 'diagnosis_done', 'proposal_sent', 'qualified_lead', 'deal_won', 'invoice_paid', 'recurring_client_started');

-- CreateEnum
CREATE TYPE "MetaSendStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped_no_consent', 'test');

-- CreateEnum
CREATE TYPE "OdooSyncType" AS ENUM ('contacts_export', 'contacts_import', 'invoices_export', 'invoices_import', 'payments_import', 'products_export', 'expenses_import');

-- CreateEnum
CREATE TYPE "OdooSyncMode" AS ENUM ('api', 'csv', 'playwright');

-- CreateEnum
CREATE TYPE "OdooSyncStatus" AS ENUM ('pending', 'running', 'success', 'error', 'cancelled');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'status_change', 'sync', 'meta_event', 'invoice_queue', 'import', 'export', 'login', 'unlock');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "vatId" TEXT,
    "sector" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "notes" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "companyId" TEXT,
    "personId" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "city" TEXT,
    "province" TEXT,
    "sector" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "temperature" "Temperature" NOT NULL DEFAULT 'cold',
    "source" "LeadSource" NOT NULL DEFAULT 'other',
    "probability" INTEGER,
    "score" INTEGER,
    "campaignId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "metaClickId" TEXT,
    "metaLeadId" TEXT,
    "metaFbp" TEXT,
    "painDetected" TEXT,
    "potentialService" TEXT,
    "serviceId" TEXT,
    "estimatedBudget" DECIMAL(12,2),
    "objections" TEXT,
    "internalNotes" TEXT,
    "consentStatus" "ConsentStatus" NOT NULL DEFAULT 'unknown',
    "consentNote" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "channel" "InteractionChannel" NOT NULL,
    "direction" "InteractionDirection" NOT NULL DEFAULT 'outbound',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "opportunityId" TEXT,
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "serviceId" TEXT,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'discovered',
    "estimatedValue" DECIMAL(12,2),
    "acceptedValue" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "probability" INTEGER NOT NULL DEFAULT 30,
    "expectedCloseAt" TIMESTAMP(3),
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "urgencyLevel" INTEGER,
    "costOfInaction" TEXT,
    "kairasFit" INTEGER,
    "lostReason" TEXT,
    "nextAction" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "observations" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "companyId" TEXT,
    "vatId" TEXT,
    "billingEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "odooPartnerId" TEXT,
    "satisfaction" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(12,2),
    "priceMin" DECIMAL(12,2),
    "priceMax" DECIMAL(12,2),
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "billingUnit" "BillingUnit" NOT NULL DEFAULT 'project',
    "canBeRecurring" BOOLEAN NOT NULL DEFAULT false,
    "deliverables" TEXT,
    "proposalTemplate" TEXT,
    "odooProductRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringService" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "title" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "periodicity" "Periodicity" NOT NULL DEFAULT 'monthly',
    "status" "RecurringStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "nextInvoiceAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "estimatedMargin" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecurringService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "opportunityId" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'draft',
    "amountNet" DECIMAL(12,2),
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "amountTotal" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sentAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "documentUrl" TEXT,
    "conditions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalId" TEXT,
    "mainServiceId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'not_started',
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "startAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "estimatedMargin" DECIMAL(5,2),
    "description" TEXT,
    "scope" TEXT,
    "outOfScope" TEXT,
    "deliverables" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'other',
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "dueAt" TIMESTAMP(3),
    "remindAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "checklist" JSONB,
    "recurrence" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "workType" "WorkType" NOT NULL DEFAULT 'other',
    "source" "TimeEntrySource" NOT NULL DEFAULT 'timer',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "calculatedAmount" DECIMAL(12,2),
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'draft',
    "clientId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "opportunityId" TEXT,
    "proposalId" TEXT,
    "serviceId" TEXT,
    "campaignId" TEXT,
    "invoiceDraftRequestId" TEXT,
    "invoiceRecordId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "currentTitle" TEXT,
    "workType" "WorkType" NOT NULL DEFAULT 'other',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "serviceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyRate" (
    "id" TEXT NOT NULL,
    "scope" "RateScope" NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "clientId" TEXT,
    "projectId" TEXT,
    "serviceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "filters" JSONB,
    "totals" JSONB,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CalendarEventType" NOT NULL DEFAULT 'meeting',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'scheduled',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "location" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "opportunityId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "externalCalendarId" TEXT,
    "externalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "odooInvoiceNumber" TEXT,
    "odooId" TEXT,
    "odooUrl" TEXT,
    "concept" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft_needed',
    "origin" "InvoiceOrigin" NOT NULL DEFAULT 'manual',
    "amountNet" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "amountTotal" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDraftRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "proposalId" TEXT,
    "recurringServiceId" TEXT,
    "concept" TEXT NOT NULL,
    "lines" JSONB,
    "amountNet" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "amountTotal" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "InvoiceDraftStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "notes" TEXT,
    "invoiceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceDraftRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseRecord" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "supplier" TEXT,
    "amountNet" DECIMAL(12,2),
    "vatAmount" DECIMAL(12,2),
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expenseAt" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "odooRef" TEXT,
    "notes" TEXT,
    "clientId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'other',
    "objective" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "spent" DECIMAL(12,2),
    "promotedService" TEXT,
    "url" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "manualCostPerLead" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaEventLog" (
    "id" TEXT NOT NULL,
    "internalEvent" "MetaEventName" NOT NULL,
    "metaEventName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "hashedEmail" TEXT,
    "hashedPhone" TEXT,
    "fbp" TEXT,
    "fbc" TEXT,
    "eventValue" DECIMAL(12,2),
    "currency" TEXT,
    "status" "MetaSendStatus" NOT NULL DEFAULT 'pending',
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "metaResponse" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdooSyncJob" (
    "id" TEXT NOT NULL,
    "type" "OdooSyncType" NOT NULL,
    "mode" "OdooSyncMode" NOT NULL,
    "status" "OdooSyncStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "itemsTotal" INTEGER,
    "itemsOk" INTEGER,
    "itemsError" INTEGER,
    "fileName" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OdooSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LeadTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeadTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClientContacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientContacts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClientTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClientTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProposalServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProposalServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectSecondaryServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectSecondaryServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CampaignTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TaskTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TimeEntryTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TimeEntryTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_temperature_idx" ON "Lead"("temperature");

-- CreateIndex
CREATE INDEX "Lead_nextActionAt_idx" ON "Lead"("nextActionAt");

-- CreateIndex
CREATE INDEX "Interaction_leadId_occurredAt_idx" ON "Interaction"("leadId", "occurredAt");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_expectedCloseAt_idx" ON "Opportunity"("expectedCloseAt");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "RecurringService_status_nextInvoiceAt_idx" ON "RecurringService"("status", "nextInvoiceAt");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_deadline_idx" ON "Project"("deadline");

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startedAt_idx" ON "TimeEntry"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeEntry_clientId_idx" ON "TimeEntry"("clientId");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");

-- CreateIndex
CREATE INDEX "TimerSession_userId_active_idx" ON "TimerSession"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TimeReport_shareToken_key" ON "TimeReport"("shareToken");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_idx" ON "CalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "InvoiceRecord_status_idx" ON "InvoiceRecord"("status");

-- CreateIndex
CREATE INDEX "InvoiceRecord_issuedAt_idx" ON "InvoiceRecord"("issuedAt");

-- CreateIndex
CREATE INDEX "InvoiceDraftRequest_status_idx" ON "InvoiceDraftRequest"("status");

-- CreateIndex
CREATE INDEX "ExpenseRecord_expenseAt_idx" ON "ExpenseRecord"("expenseAt");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MetaEventLog_eventId_key" ON "MetaEventLog"("eventId");

-- CreateIndex
CREATE INDEX "MetaEventLog_status_idx" ON "MetaEventLog"("status");

-- CreateIndex
CREATE INDEX "MetaEventLog_internalEvent_idx" ON "MetaEventLog"("internalEvent");

-- CreateIndex
CREATE INDEX "OdooSyncJob_status_type_idx" ON "OdooSyncJob"("status", "type");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "_LeadTags_B_index" ON "_LeadTags"("B");

-- CreateIndex
CREATE INDEX "_ClientContacts_B_index" ON "_ClientContacts"("B");

-- CreateIndex
CREATE INDEX "_ClientTags_B_index" ON "_ClientTags"("B");

-- CreateIndex
CREATE INDEX "_ProposalServices_B_index" ON "_ProposalServices"("B");

-- CreateIndex
CREATE INDEX "_ProjectSecondaryServices_B_index" ON "_ProjectSecondaryServices"("B");

-- CreateIndex
CREATE INDEX "_ProjectTags_B_index" ON "_ProjectTags"("B");

-- CreateIndex
CREATE INDEX "_CampaignTags_B_index" ON "_CampaignTags"("B");

-- CreateIndex
CREATE INDEX "_TaskTags_B_index" ON "_TaskTags"("B");

-- CreateIndex
CREATE INDEX "_TimeEntryTags_B_index" ON "_TimeEntryTags"("B");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringService" ADD CONSTRAINT "RecurringService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringService" ADD CONSTRAINT "RecurringService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_mainServiceId_fkey" FOREIGN KEY ("mainServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_invoiceDraftRequestId_fkey" FOREIGN KEY ("invoiceDraftRequestId") REFERENCES "InvoiceDraftRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSession" ADD CONSTRAINT "TimerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyRate" ADD CONSTRAINT "HourlyRate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyRate" ADD CONSTRAINT "HourlyRate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyRate" ADD CONSTRAINT "HourlyRate_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftRequest" ADD CONSTRAINT "InvoiceDraftRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftRequest" ADD CONSTRAINT "InvoiceDraftRequest_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftRequest" ADD CONSTRAINT "InvoiceDraftRequest_recurringServiceId_fkey" FOREIGN KEY ("recurringServiceId") REFERENCES "RecurringService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDraftRequest" ADD CONSTRAINT "InvoiceDraftRequest_invoiceRecordId_fkey" FOREIGN KEY ("invoiceRecordId") REFERENCES "InvoiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaEventLog" ADD CONSTRAINT "MetaEventLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadTags" ADD CONSTRAINT "_LeadTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadTags" ADD CONSTRAINT "_LeadTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientContacts" ADD CONSTRAINT "_ClientContacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientContacts" ADD CONSTRAINT "_ClientContacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientTags" ADD CONSTRAINT "_ClientTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClientTags" ADD CONSTRAINT "_ClientTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalServices" ADD CONSTRAINT "_ProposalServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProposalServices" ADD CONSTRAINT "_ProposalServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectSecondaryServices" ADD CONSTRAINT "_ProjectSecondaryServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectSecondaryServices" ADD CONSTRAINT "_ProjectSecondaryServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTags" ADD CONSTRAINT "_ProjectTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTags" ADD CONSTRAINT "_ProjectTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignTags" ADD CONSTRAINT "_CampaignTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignTags" ADD CONSTRAINT "_CampaignTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimeEntryTags" ADD CONSTRAINT "_TimeEntryTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimeEntryTags" ADD CONSTRAINT "_TimeEntryTags_B_fkey" FOREIGN KEY ("B") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

