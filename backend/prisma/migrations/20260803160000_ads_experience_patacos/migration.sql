-- Créditos de experiência: saldo promocional rastreável, com validade própria
-- e separado da carteira adquirida pelo anunciante.
CREATE TYPE "AdExperienceGrantStatus" AS ENUM ('active', 'consumed', 'expired', 'cancelled');
CREATE TYPE "AdCampaignCreditSource" AS ENUM ('purchased', 'experience');

ALTER TYPE "AdCreditLedgerType" ADD VALUE IF NOT EXISTS 'experience_grant';
ALTER TYPE "AdCreditLedgerType" ADD VALUE IF NOT EXISTS 'experience_expired';

CREATE TABLE "AdExperienceGrant" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "originalMilipatacos" BIGINT NOT NULL,
  "remainingMilipatacos" BIGINT NOT NULL DEFAULT 0,
  "expiredMilipatacos" BIGINT NOT NULL DEFAULT 0,
  "status" "AdExperienceGrantStatus" NOT NULL DEFAULT 'active',
  "reason" VARCHAR(500) NOT NULL,
  "note" TEXT,
  "overrideReason" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdExperienceGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdCampaignCreditAllocation" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "experienceGrantId" TEXT,
  "source" "AdCampaignCreditSource" NOT NULL,
  "originalMilipatacos" BIGINT NOT NULL,
  "reservedMilipatacos" BIGINT NOT NULL DEFAULT 0,
  "spentMilipatacos" BIGINT NOT NULL DEFAULT 0,
  "expiredMilipatacos" BIGINT NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdCampaignCreditAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdExperienceGrant_accountId_status_expiresAt_idx" ON "AdExperienceGrant"("accountId", "status", "expiresAt");
CREATE INDEX "AdExperienceGrant_createdAt_idx" ON "AdExperienceGrant"("createdAt");
CREATE INDEX "AdCampaignCreditAllocation_campaignId_source_idx" ON "AdCampaignCreditAllocation"("campaignId", "source");
CREATE INDEX "AdCampaignCreditAllocation_experienceGrantId_idx" ON "AdCampaignCreditAllocation"("experienceGrantId");
CREATE INDEX "AdCampaignCreditAllocation_expiresAt_idx" ON "AdCampaignCreditAllocation"("expiresAt");

ALTER TABLE "AdExperienceGrant" ADD CONSTRAINT "AdExperienceGrant_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "AdvertiserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdExperienceGrant" ADD CONSTRAINT "AdExperienceGrant_grantedByUserId_fkey"
  FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdCampaignCreditAllocation" ADD CONSTRAINT "AdCampaignCreditAllocation_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCampaignCreditAllocation" ADD CONSTRAINT "AdCampaignCreditAllocation_experienceGrantId_fkey"
  FOREIGN KEY ("experienceGrantId") REFERENCES "AdExperienceGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
