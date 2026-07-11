-- Durable delivery tokens make impressions and clicks auditable and idempotent.
ALTER TYPE "AdCreditLedgerType" ADD VALUE IF NOT EXISTS 'delivery_charge';

CREATE TABLE "AdDelivery" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "slot" "AdSlot" NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "venueId" TEXT,
    "userId" TEXT,
    "sessionHash" TEXT,
    "context" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "renderedAt" TIMESTAMP(3),
    "impressionRecordedAt" TIMESTAMP(3),
    "clickRecordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdDelivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdEventLog" ADD COLUMN "deliveryId" TEXT;

CREATE UNIQUE INDEX "AdDelivery_token_key" ON "AdDelivery"("token");
CREATE INDEX "AdDelivery_slot_createdAt_idx" ON "AdDelivery"("slot", "createdAt");
CREATE INDEX "AdDelivery_campaignId_createdAt_idx" ON "AdDelivery"("campaignId", "createdAt");
CREATE INDEX "AdDelivery_creativeId_createdAt_idx" ON "AdDelivery"("creativeId", "createdAt");
CREATE INDEX "AdDelivery_sessionHash_createdAt_idx" ON "AdDelivery"("sessionHash", "createdAt");
CREATE INDEX "AdDelivery_expiresAt_idx" ON "AdDelivery"("expiresAt");
CREATE INDEX "AdEventLog_deliveryId_type_idx" ON "AdEventLog"("deliveryId", "type");
CREATE UNIQUE INDEX "AdEventLog_deliveryId_type_key" ON "AdEventLog"("deliveryId", "type");

ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdDelivery" ADD CONSTRAINT "AdDelivery_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdEventLog" ADD CONSTRAINT "AdEventLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "AdDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
