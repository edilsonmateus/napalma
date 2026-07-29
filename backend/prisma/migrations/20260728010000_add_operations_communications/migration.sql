CREATE TYPE "OperationCommunicationRecipientType" AS ENUM ('venue_producer', 'partner_brand', 'user');
CREATE TYPE "OperationCommunicationStatus" AS ENUM ('draft', 'sent', 'failed');

ALTER TYPE "OperationScope" ADD VALUE IF NOT EXISTS 'communications';

CREATE TABLE "OperationCommunicationMessage" (
  "id" TEXT NOT NULL,
  "recipientName" TEXT,
  "recipientEmail" TEXT,
  "recipientType" "OperationCommunicationRecipientType",
  "recipientReferenceId" TEXT,
  "subject" VARCHAR(220) NOT NULL DEFAULT '',
  "contentHtml" TEXT NOT NULL DEFAULT '',
  "contentText" TEXT NOT NULL DEFAULT '',
  "templateKey" VARCHAR(80),
  "includePartnerRail" BOOLEAN NOT NULL DEFAULT false,
  "status" "OperationCommunicationStatus" NOT NULL DEFAULT 'draft',
  "failureReason" VARCHAR(500),
  "sentAt" TIMESTAMP(3),
  "authorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationCommunicationMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationCommunicationMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "OperationCommunicationMessage_status_updatedAt_idx" ON "OperationCommunicationMessage"("status", "updatedAt");
CREATE INDEX "OperationCommunicationMessage_recipientEmail_createdAt_idx" ON "OperationCommunicationMessage"("recipientEmail", "createdAt");
CREATE INDEX "OperationCommunicationMessage_authorUserId_updatedAt_idx" ON "OperationCommunicationMessage"("authorUserId", "updatedAt");
