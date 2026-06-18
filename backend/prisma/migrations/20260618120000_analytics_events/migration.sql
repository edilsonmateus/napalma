-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "venueId" TEXT,
    "eventId" TEXT,
    "artistId" TEXT,
    "region" TEXT,
    "city" TEXT,
    "state" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_venueId_type_createdAt_idx" ON "AnalyticsEvent"("venueId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventId_type_createdAt_idx" ON "AnalyticsEvent"("eventId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_region_createdAt_idx" ON "AnalyticsEvent"("region", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_city_createdAt_idx" ON "AnalyticsEvent"("city", "createdAt");
