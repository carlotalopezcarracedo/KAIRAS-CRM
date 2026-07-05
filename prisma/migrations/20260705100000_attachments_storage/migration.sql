-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "uploadedById" TEXT,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "kind" SET NOT NULL,
ALTER COLUMN "kind" SET DEFAULT 'other';

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

