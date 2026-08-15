-- Acceptance evidence is intentionally independent from preference consent.
-- It preserves the exact document version and hash accepted by an account.

CREATE TYPE "LegalDocumentAcceptanceAction" AS ENUM ('accepted', 'declined');
CREATE TYPE "LegalDocumentAcceptanceContext" AS ENUM (
  'account_signup',
  'account_review',
  'artist_claim',
  'venue_claim',
  'advertiser_access',
  'advertiser_campaign',
  'patacos_purchase'
);

CREATE TABLE "LegalDocumentAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "audience" "LegalDocumentAudience" NOT NULL,
  "context" "LegalDocumentAcceptanceContext" NOT NULL,
  "action" "LegalDocumentAcceptanceAction" NOT NULL DEFAULT 'accepted',
  "versionLabel" VARCHAR(32) NOT NULL,
  "contentSha256" VARCHAR(64) NOT NULL,
  "source" VARCHAR(60) NOT NULL DEFAULT 'in_app',
  "userAgent" VARCHAR(512),
  "ipHash" VARCHAR(64),
  "metadata" JSONB,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalDocumentAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegalDocumentAcceptance_userId_documentId_acceptedAt_idx"
  ON "LegalDocumentAcceptance"("userId", "documentId", "acceptedAt");
CREATE INDEX "LegalDocumentAcceptance_userId_versionId_context_idx"
  ON "LegalDocumentAcceptance"("userId", "versionId", "context");
CREATE INDEX "LegalDocumentAcceptance_versionId_action_idx"
  ON "LegalDocumentAcceptance"("versionId", "action");
CREATE INDEX "LegalDocumentAcceptance_documentId_acceptedAt_idx"
  ON "LegalDocumentAcceptance"("documentId", "acceptedAt");

ALTER TABLE "LegalDocumentAcceptance"
  ADD CONSTRAINT "LegalDocumentAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalDocumentAcceptance"
  ADD CONSTRAINT "LegalDocumentAcceptance_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LegalDocumentAcceptance"
  ADD CONSTRAINT "LegalDocumentAcceptance_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
