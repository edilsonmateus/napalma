-- Legal document catalogue: versioning, integrity and operational audit base.
-- No public acceptance is activated by this migration.
CREATE TYPE "LegalDocumentCategory" AS ENUM ('terms_of_use', 'privacy_cookies', 'content_moderation', 'claim_management', 'advertising_terms', 'patacos_policy', 'partnership_terms', 'internal_operations');
CREATE TYPE "LegalDocumentVersionStatus" AS ENUM ('draft', 'in_review', 'approved', 'scheduled', 'active', 'replaced', 'archived');
CREATE TYPE "LegalDocumentAudience" AS ENUM ('visitor', 'user', 'artist_manager', 'venue_manager', 'producer', 'advertiser', 'strategic_partner', 'internal_operator');
CREATE TYPE "LegalDocumentChangeType" AS ENUM ('editorial', 'material');

ALTER TYPE "OperationScope" ADD VALUE IF NOT EXISTS 'documents';

CREATE TABLE "LegalDocument" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(80) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "category" "LegalDocumentCategory" NOT NULL,
  "summary" VARCHAR(500),
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionLabel" VARCHAR(32) NOT NULL,
  "status" "LegalDocumentVersionStatus" NOT NULL DEFAULT 'draft',
  "contentText" TEXT NOT NULL DEFAULT '',
  "contentSha256" VARCHAR(64) NOT NULL,
  "sourceDocumentUrl" VARCHAR(1000),
  "sourceDocumentSha256" VARCHAR(64),
  "changeType" "LegalDocumentChangeType" NOT NULL DEFAULT 'material',
  "changeSummary" VARCHAR(1000),
  "requiresReacceptance" BOOLEAN NOT NULL DEFAULT false,
  "effectiveAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "publishedByUserId" TEXT,
  "replacedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDocumentVersionAudience" (
  "id" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "audience" "LegalDocumentAudience" NOT NULL,
  CONSTRAINT "LegalDocumentVersionAudience_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocument_key_key" ON "LegalDocument"("key");
CREATE INDEX "LegalDocument_category_isPublic_idx" ON "LegalDocument"("category", "isPublic");
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_versionLabel_key" ON "LegalDocumentVersion"("documentId", "versionLabel");
CREATE INDEX "LegalDocumentVersion_documentId_status_idx" ON "LegalDocumentVersion"("documentId", "status");
CREATE INDEX "LegalDocumentVersion_status_effectiveAt_idx" ON "LegalDocumentVersion"("status", "effectiveAt");
CREATE UNIQUE INDEX "LegalDocumentVersionAudience_versionId_audience_key" ON "LegalDocumentVersionAudience"("versionId", "audience");
CREATE INDEX "LegalDocumentVersionAudience_audience_idx" ON "LegalDocumentVersionAudience"("audience");

ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalDocumentVersionAudience" ADD CONSTRAINT "LegalDocumentVersionAudience_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
