-- CreateEnum
CREATE TYPE "AdvertiserAccountType" AS ENUM ('unclassified', 'venue', 'producer', 'artist', 'brand', 'agency', 'group', 'internal');

-- CreateEnum
CREATE TYPE "AdvertiserAccountStatus" AS ENUM ('draft', 'pending_review', 'active', 'suspended', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "AdvertiserMembershipRole" AS ENUM ('owner', 'admin', 'campaign_manager', 'analyst', 'billing_manager', 'viewer');

-- CreateEnum
CREATE TYPE "AdvertiserMembershipStatus" AS ENUM ('invited', 'active', 'suspended', 'revoked');

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "advertiserAccountId" TEXT;

-- CreateTable
CREATE TABLE "AdvertiserAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AdvertiserAccountType" NOT NULL DEFAULT 'unclassified',
    "status" "AdvertiserAccountStatus" NOT NULL DEFAULT 'draft',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "legacyKey" TEXT,
    "legalName" TEXT,
    "documentNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertiserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertiserMembership" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdvertiserMembershipRole" NOT NULL DEFAULT 'viewer',
    "status" "AdvertiserMembershipStatus" NOT NULL DEFAULT 'invited',
    "invitedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvertiserMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvertiserAccount_legacyKey_key" ON "AdvertiserAccount"("legacyKey");

-- CreateIndex
CREATE INDEX "AdvertiserAccount_status_type_idx" ON "AdvertiserAccount"("status", "type");

-- CreateIndex
CREATE INDEX "AdvertiserAccount_name_idx" ON "AdvertiserAccount"("name");

-- CreateIndex
CREATE INDEX "AdvertiserMembership_userId_status_idx" ON "AdvertiserMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "AdvertiserMembership_accountId_status_idx" ON "AdvertiserMembership"("accountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdvertiserMembership_accountId_userId_key" ON "AdvertiserMembership"("accountId", "userId");

-- CreateIndex
CREATE INDEX "AdCampaign_advertiserAccountId_status_idx" ON "AdCampaign"("advertiserAccountId", "status");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserAccountId_fkey" FOREIGN KEY ("advertiserAccountId") REFERENCES "AdvertiserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserAccount" ADD CONSTRAINT "AdvertiserAccount_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserAccount" ADD CONSTRAINT "AdvertiserAccount_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserMembership" ADD CONSTRAINT "AdvertiserMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdvertiserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserMembership" ADD CONSTRAINT "AdvertiserMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserMembership" ADD CONSTRAINT "AdvertiserMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
