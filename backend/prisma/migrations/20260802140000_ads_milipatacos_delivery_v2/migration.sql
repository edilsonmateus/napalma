-- Ads financeiro V2: 1 pataco = 1.000 milipatacos. Campos antigos permanecem
-- apenas como legado visual durante a transição; os novos campos são a verdade financeira.
ALTER TABLE "AdCampaign" ADD COLUMN "budgetMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN "reservedMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN "spentMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCampaign" ADD COLUMN "pricingSnapshot" JSONB;
ALTER TABLE "AdCampaign" ADD COLUMN "pricingVersion" TEXT;

ALTER TABLE "AdvertiserWallet" ADD COLUMN "balanceMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdPaymentOrder" ADD COLUMN "creditAmountMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCreditLedgerEntry" ADD COLUMN "amountMilipatacos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "AdCreditLedgerEntry" ADD COLUMN "balanceAfterMilipatacos" BIGINT NOT NULL DEFAULT 0;

UPDATE "AdvertiserWallet" SET "balanceMilipatacos" = "balance"::BIGINT * 1000 WHERE "balanceMilipatacos" = 0;
UPDATE "AdCampaign" SET
  "budgetMilipatacos" = "budgetCredits"::BIGINT * 1000,
  "spentMilipatacos" = "spentCredits"::BIGINT * 1000,
  "reservedMilipatacos" = GREATEST("budgetCredits" - "spentCredits", 0)::BIGINT * 1000
WHERE "budgetMilipatacos" = 0;
UPDATE "AdPaymentOrder" SET "creditAmountMilipatacos" = "creditAmount"::BIGINT * 1000 WHERE "creditAmountMilipatacos" = 0;
UPDATE "AdCreditLedgerEntry" SET
  "amountMilipatacos" = "delta"::BIGINT * 1000,
  "balanceAfterMilipatacos" = "balanceAfter"::BIGINT * 1000
WHERE "amountMilipatacos" = 0;
