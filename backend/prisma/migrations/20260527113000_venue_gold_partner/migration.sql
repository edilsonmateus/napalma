-- Add Gold Partner flag for venues
ALTER TABLE "Venue"
ADD COLUMN "goldPartner" BOOLEAN NOT NULL DEFAULT false;

