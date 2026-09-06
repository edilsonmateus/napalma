-- Contratações comerciais especiais são aditivas. Nenhuma campanha, conta,
-- carteira, sessão ou envelope existente é reprocessado por esta migração.

CREATE TYPE "CommercialAgreementType" AS ENUM (
  'sponsorship',
  'exclusive_placement',
  'reserved_placement',
  'negotiated_campaign'
);

CREATE TYPE "CommercialAgreementStatus" AS ENUM (
  'draft',
  'pending_counterpart_details',
  'pending_signature',
  'pending_ratification',
  'completed',
  'declined',
  'expired',
  'cancelled'
);

CREATE TYPE "CommercialAgreementPlacementMode" AS ENUM ('standard', 'exclusive');

ALTER TYPE "OperationScope" ADD VALUE IF NOT EXISTS 'commercial_contracts';

CREATE TABLE "CommercialAgreement" (
  "id" TEXT NOT NULL,
  "advertiserAccountId" TEXT NOT NULL,
  "title" VARCHAR(220) NOT NULL,
  "type" "CommercialAgreementType" NOT NULL,
  "status" "CommercialAgreementStatus" NOT NULL DEFAULT 'draft',
  "commercialReference" VARCHAR(120),
  "conditionsSummary" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "counterpartUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" VARCHAR(600),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialAgreementCampaign" (
  "agreementId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialAgreementCampaign_pkey" PRIMARY KEY ("agreementId", "campaignId")
);

CREATE TABLE "CommercialAgreementPlacement" (
  "id" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "slot" "AdSlot" NOT NULL,
  "mode" "CommercialAgreementPlacementMode" NOT NULL DEFAULT 'standard',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialAgreementPlacement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LegalSignatureEnvelope"
  ADD COLUMN "commercialAgreementId" TEXT;

CREATE UNIQUE INDEX "LegalSignatureEnvelope_commercialAgreementId_key"
  ON "LegalSignatureEnvelope"("commercialAgreementId");
CREATE INDEX "CommercialAgreement_advertiserAccountId_status_updatedAt_idx"
  ON "CommercialAgreement"("advertiserAccountId", "status", "updatedAt");
CREATE INDEX "CommercialAgreement_counterpartUserId_status_idx"
  ON "CommercialAgreement"("counterpartUserId", "status");
CREATE INDEX "CommercialAgreement_status_startsAt_endsAt_idx"
  ON "CommercialAgreement"("status", "startsAt", "endsAt");
CREATE INDEX "CommercialAgreementCampaign_campaignId_idx"
  ON "CommercialAgreementCampaign"("campaignId");
CREATE UNIQUE INDEX "CommercialAgreementPlacement_agreementId_slot_key"
  ON "CommercialAgreementPlacement"("agreementId", "slot");
CREATE INDEX "CommercialAgreementPlacement_slot_mode_idx"
  ON "CommercialAgreementPlacement"("slot", "mode");

ALTER TABLE "CommercialAgreement"
  ADD CONSTRAINT "CommercialAgreement_advertiserAccountId_fkey"
  FOREIGN KEY ("advertiserAccountId") REFERENCES "AdvertiserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialAgreement_counterpartUserId_fkey"
  FOREIGN KEY ("counterpartUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialAgreement_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommercialAgreementCampaign"
  ADD CONSTRAINT "CommercialAgreementCampaign_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialAgreementCampaign_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommercialAgreementPlacement"
  ADD CONSTRAINT "CommercialAgreementPlacement_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LegalSignatureEnvelope"
  ADD CONSTRAINT "LegalSignatureEnvelope_commercialAgreementId_fkey"
  FOREIGN KEY ("commercialAgreementId") REFERENCES "CommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
