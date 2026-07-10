-- CreateEnum
CREATE TYPE "AdPaymentProvider" AS ENUM ('mock', 'mercado_pago');

-- CreateEnum
CREATE TYPE "AdPaymentStatus" AS ENUM ('created', 'pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded');

-- CreateEnum
CREATE TYPE "AdCreditLedgerType" AS ENUM ('purchase', 'campaign_allocation', 'campaign_refund', 'payment_refund', 'admin_adjustment');

-- AlterTable
ALTER TABLE "AdCampaign"
ADD COLUMN "budgetCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "spentCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdvertiserWallet" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvertiserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPaymentOrder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "provider" "AdPaymentProvider" NOT NULL DEFAULT 'mock',
    "status" "AdPaymentStatus" NOT NULL DEFAULT 'created',
    "packageCode" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "externalReference" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL DEFAULT '/workspace/anunciante',
    "createdByUserId" TEXT NOT NULL,
    "metadata" JSONB,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdPaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT,
    "paymentOrderId" TEXT,
    "type" "AdCreditLedgerType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdCreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvertiserWallet_accountId_key" ON "AdvertiserWallet"("accountId");
CREATE UNIQUE INDEX "AdPaymentOrder_externalReference_key" ON "AdPaymentOrder"("externalReference");
CREATE UNIQUE INDEX "AdPaymentOrder_providerPaymentId_key" ON "AdPaymentOrder"("providerPaymentId");
CREATE UNIQUE INDEX "AdPaymentOrder_idempotencyKey_key" ON "AdPaymentOrder"("idempotencyKey");
CREATE INDEX "AdPaymentOrder_accountId_createdAt_idx" ON "AdPaymentOrder"("accountId", "createdAt");
CREATE INDEX "AdPaymentOrder_status_createdAt_idx" ON "AdPaymentOrder"("status", "createdAt");
CREATE INDEX "AdPaymentOrder_campaignId_idx" ON "AdPaymentOrder"("campaignId");
CREATE UNIQUE INDEX "AdCreditLedgerEntry_idempotencyKey_key" ON "AdCreditLedgerEntry"("idempotencyKey");
CREATE INDEX "AdCreditLedgerEntry_accountId_createdAt_idx" ON "AdCreditLedgerEntry"("accountId", "createdAt");
CREATE INDEX "AdCreditLedgerEntry_campaignId_createdAt_idx" ON "AdCreditLedgerEntry"("campaignId", "createdAt");
CREATE INDEX "AdCreditLedgerEntry_paymentOrderId_idx" ON "AdCreditLedgerEntry"("paymentOrderId");

-- AddForeignKey
ALTER TABLE "AdvertiserWallet" ADD CONSTRAINT "AdvertiserWallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdvertiserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdPaymentOrder" ADD CONSTRAINT "AdPaymentOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdvertiserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdPaymentOrder" ADD CONSTRAINT "AdPaymentOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdPaymentOrder" ADD CONSTRAINT "AdPaymentOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdCreditLedgerEntry" ADD CONSTRAINT "AdCreditLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdvertiserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCreditLedgerEntry" ADD CONSTRAINT "AdCreditLedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdCreditLedgerEntry" ADD CONSTRAINT "AdCreditLedgerEntry_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "AdPaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdCreditLedgerEntry" ADD CONSTRAINT "AdCreditLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
