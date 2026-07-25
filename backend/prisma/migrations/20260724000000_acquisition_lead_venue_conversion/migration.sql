-- Links an acquisition opportunity to the internal venue created from it.
-- A converted venue is deliberately not published by this relation.
ALTER TABLE "AcquisitionLead"
  ADD COLUMN "convertedVenueId" TEXT,
  ADD COLUMN "convertedAt" TIMESTAMP(3),
  ADD COLUMN "convertedByUserId" TEXT;

CREATE UNIQUE INDEX "AcquisitionLead_convertedVenueId_key" ON "AcquisitionLead"("convertedVenueId");

ALTER TABLE "AcquisitionLead"
  ADD CONSTRAINT "AcquisitionLead_convertedVenueId_fkey"
  FOREIGN KEY ("convertedVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
