-- Privacy governance foundation: append-only consent, LGPD requests and audit metadata.
CREATE TYPE "PrivacyConsentPurpose" AS ENUM ('cultural_personalization', 'ads_personalization');
CREATE TYPE "PrivacyRequestType" AS ENUM ('access', 'data_export', 'deletion', 'anonymization', 'correction', 'opposition');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('received', 'in_review', 'completed', 'rejected', 'cancelled');

CREATE TABLE "PrivacyConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "PrivacyConsentPurpose" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'privacy_center',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'received',
    "details" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "handledByUserId" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyConsentRecord_userId_purpose_createdAt_idx" ON "PrivacyConsentRecord"("userId", "purpose", "createdAt");
CREATE INDEX "PrivacyRequest_userId_requestedAt_idx" ON "PrivacyRequest"("userId", "requestedAt");
CREATE INDEX "PrivacyRequest_status_requestedAt_idx" ON "PrivacyRequest"("status", "requestedAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_subjectType_subjectId_createdAt_idx" ON "AuditLog"("subjectType", "subjectId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "PrivacyConsentRecord" ADD CONSTRAINT "PrivacyConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
