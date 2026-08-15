-- Advanced signatures are intentionally stored independently from simple
-- legal acceptances. They keep a frozen text snapshot plus the evidence of
-- each authentication factor used by the signatory.

CREATE TYPE "LegalSignatureEnvelopeStatus" AS ENUM ('draft', 'pending_signature', 'completed', 'declined', 'expired', 'cancelled');
CREATE TYPE "LegalSignatureParticipantStatus" AS ENUM ('pending', 'viewed', 'signed', 'declined', 'expired');
CREATE TYPE "LegalSignatureEvidenceMethod" AS ENUM ('password', 'email_code', 'webauthn');

CREATE TABLE "LegalSignatureEnvelope" (
  "id" TEXT NOT NULL,
  "protocol" VARCHAR(40) NOT NULL,
  "title" VARCHAR(220) NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "documentTitleSnapshot" VARCHAR(220) NOT NULL,
  "versionLabelSnapshot" VARCHAR(32) NOT NULL,
  "contentSnapshot" TEXT NOT NULL,
  "contentSha256" VARCHAR(64) NOT NULL,
  "status" "LegalSignatureEnvelopeStatus" NOT NULL DEFAULT 'draft',
  "expiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" VARCHAR(600),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalSignatureEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalSignatureParticipant" (
  "id" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "userId" TEXT,
  "nameSnapshot" VARCHAR(180) NOT NULL,
  "emailSnapshot" VARCHAR(320) NOT NULL,
  "roleLabel" VARCHAR(120),
  "signingOrder" INTEGER NOT NULL DEFAULT 1,
  "status" "LegalSignatureParticipantStatus" NOT NULL DEFAULT 'pending',
  "invitationTokenHash" VARCHAR(64) NOT NULL,
  "invitationExpiresAt" TIMESTAMP(3) NOT NULL,
  "invitationSentAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "declineReason" VARCHAR(600),
  "emailCodeHash" VARCHAR(64),
  "emailCodeExpiresAt" TIMESTAMP(3),
  "emailCodeUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalSignatureParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalSignatureEvidence" (
  "id" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "method" "LegalSignatureEvidenceMethod" NOT NULL,
  "contentSha256" VARCHAR(64) NOT NULL,
  "userAgent" VARCHAR(512),
  "ipHash" VARCHAR(64),
  "metadata" JSONB,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalSignatureEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalSignatureEvent" (
  "id" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "participantId" TEXT,
  "actorUserId" TEXT,
  "action" VARCHAR(80) NOT NULL,
  "metadata" JSONB,
  "ipHash" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalSignatureEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalSignatureEnvelope_protocol_key" ON "LegalSignatureEnvelope"("protocol");
CREATE INDEX "LegalSignatureEnvelope_status_expiresAt_idx" ON "LegalSignatureEnvelope"("status", "expiresAt");
CREATE INDEX "LegalSignatureEnvelope_documentVersionId_createdAt_idx" ON "LegalSignatureEnvelope"("documentVersionId", "createdAt");
CREATE UNIQUE INDEX "LegalSignatureParticipant_invitationTokenHash_key" ON "LegalSignatureParticipant"("invitationTokenHash");
CREATE UNIQUE INDEX "LegalSignatureParticipant_envelopeId_emailSnapshot_key" ON "LegalSignatureParticipant"("envelopeId", "emailSnapshot");
CREATE INDEX "LegalSignatureParticipant_userId_status_idx" ON "LegalSignatureParticipant"("userId", "status");
CREATE INDEX "LegalSignatureParticipant_envelopeId_status_idx" ON "LegalSignatureParticipant"("envelopeId", "status");
CREATE INDEX "LegalSignatureEvidence_participantId_recordedAt_idx" ON "LegalSignatureEvidence"("participantId", "recordedAt");
CREATE INDEX "LegalSignatureEvent_envelopeId_createdAt_idx" ON "LegalSignatureEvent"("envelopeId", "createdAt");
CREATE INDEX "LegalSignatureEvent_participantId_createdAt_idx" ON "LegalSignatureEvent"("participantId", "createdAt");

ALTER TABLE "LegalSignatureEnvelope" ADD CONSTRAINT "LegalSignatureEnvelope_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureEnvelope" ADD CONSTRAINT "LegalSignatureEnvelope_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureParticipant" ADD CONSTRAINT "LegalSignatureParticipant_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "LegalSignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureParticipant" ADD CONSTRAINT "LegalSignatureParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureEvidence" ADD CONSTRAINT "LegalSignatureEvidence_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "LegalSignatureParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureEvent" ADD CONSTRAINT "LegalSignatureEvent_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "LegalSignatureEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalSignatureEvent" ADD CONSTRAINT "LegalSignatureEvent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "LegalSignatureParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
