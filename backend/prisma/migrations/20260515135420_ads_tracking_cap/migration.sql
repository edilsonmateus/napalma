-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('draft', 'active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "AdSlot" AS ENUM ('explore_feed_large', 'venue_detail_inline', 'radar_header');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('impression', 'click');

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiser" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "frequencyCapDaily" INTEGER NOT NULL DEFAULT 3,
    "runInAllSlots" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "targeting" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "slot" "AdSlot" NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "destinationUrl" TEXT,
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEventLog" (
    "id" TEXT NOT NULL,
    "type" "AdEventType" NOT NULL,
    "slot" "AdSlot" NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCreative_slot_isEnabled_idx" ON "AdCreative"("slot", "isEnabled");

-- CreateIndex
CREATE INDEX "AdEventLog_campaignId_type_createdAt_idx" ON "AdEventLog"("campaignId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AdEventLog_creativeId_type_createdAt_idx" ON "AdEventLog"("creativeId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AdEventLog_userId_type_createdAt_idx" ON "AdEventLog"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEventLog" ADD CONSTRAINT "AdEventLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEventLog" ADD CONSTRAINT "AdEventLog_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEventLog" ADD CONSTRAINT "AdEventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
