ALTER TABLE "Itinerary"
  ADD COLUMN "shareToken" TEXT,
  ADD COLUMN "shareEnabledAt" TIMESTAMP(3),
  ADD COLUMN "shareExpiresAt" TIMESTAMP(3),
  ADD COLUMN "shareRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Itinerary_shareToken_key" ON "Itinerary"("shareToken");
