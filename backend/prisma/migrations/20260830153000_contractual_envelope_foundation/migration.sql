-- Additive foundation for bilateral contractual envelopes. Existing claim and
-- generic signature envelopes retain their current status and behaviour.

ALTER TYPE "LegalSignatureEnvelopeStatus" ADD VALUE IF NOT EXISTS 'pending_counterpart_details';
ALTER TYPE "LegalSignatureEnvelopeStatus" ADD VALUE IF NOT EXISTS 'pending_ratification';

CREATE TYPE "LegalSignatureIssueContext" AS ENUM ('generic', 'claim', 'advertising_contract', 'partnership_contract');
CREATE TYPE "LegalSignatureCompletionMode" AS ENUM ('participant_signature', 'proposal_acceptance', 'counterpart_then_ratification');

ALTER TABLE "LegalSignatureEnvelope"
  ADD COLUMN "issueContext" "LegalSignatureIssueContext" NOT NULL DEFAULT 'generic',
  ADD COLUMN "issueContextReferenceId" VARCHAR(80),
  ADD COLUMN "completionMode" "LegalSignatureCompletionMode" NOT NULL DEFAULT 'participant_signature',
  ADD COLUMN "counterpartLegalName" VARCHAR(240),
  ADD COLUMN "counterpartTaxId" VARCHAR(32),
  ADD COLUMN "counterpartRegisteredAddress" VARCHAR(700),
  ADD COLUMN "counterpartRepresentativeName" VARCHAR(180),
  ADD COLUMN "counterpartRepresentativeCapacity" VARCHAR(120),
  ADD COLUMN "counterpartSignatoryEmail" VARCHAR(320),
  ADD COLUMN "counterpartSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "counterpartSubmittedByUserId" TEXT,
  ADD COLUMN "issuerAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "issuerAcceptedByUserId" TEXT,
  ADD COLUMN "ratifiedAt" TIMESTAMP(3),
  ADD COLUMN "ratifiedByUserId" TEXT;

CREATE INDEX "LegalSignatureEnvelope_issueContext_status_createdAt_idx"
  ON "LegalSignatureEnvelope"("issueContext", "status", "createdAt");

CREATE INDEX "LegalSignatureEnvelope_issueContext_issueContextReferenceId_createdAt_idx"
  ON "LegalSignatureEnvelope"("issueContext", "issueContextReferenceId", "createdAt");
