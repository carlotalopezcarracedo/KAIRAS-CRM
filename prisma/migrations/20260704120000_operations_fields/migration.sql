-- CreateEnum
CREATE TYPE "ProjectBillingMode" AS ENUM ('fixed', 'hourly', 'retainer', 'mixed');

-- AlterTable
ALTER TABLE "HourlyRate" ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "billingMode" "ProjectBillingMode" NOT NULL DEFAULT 'fixed';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estimatedHours" DECIMAL(6,2);

