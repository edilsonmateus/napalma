-- Additive venue image variants. Existing Venue.imageUrl values remain valid
-- and no current row is rewritten by this migration.
CREATE TYPE "VenueImageAssetStatus" AS ENUM ('draft', 'attached', 'rejected', 'expired');
CREATE TYPE "VenueImageBannerMode" AS ENUM ('cover', 'contain_blur');

ALTER TABLE "Venue"
ADD COLUMN "bannerImageUrl" TEXT,
ADD COLUMN "bannerImageMediumUrl" TEXT,
ADD COLUMN "bannerImageSmallUrl" TEXT,
ADD COLUMN "thumbnailImageUrl" TEXT,
ADD COLUMN "thumbnailImageSmallUrl" TEXT,
ADD COLUMN "activeImageAssetId" TEXT;

CREATE TABLE "VenueImageAsset" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "venueId" TEXT,
  "status" "VenueImageAssetStatus" NOT NULL DEFAULT 'draft',
  "bannerMode" "VenueImageBannerMode" NOT NULL DEFAULT 'cover',
  "originalUrl" TEXT NOT NULL,
  "originalStorageKey" TEXT NOT NULL,
  "bannerUrl" TEXT NOT NULL,
  "bannerStorageKey" TEXT NOT NULL,
  "bannerMediumUrl" TEXT NOT NULL,
  "bannerMediumStorageKey" TEXT NOT NULL,
  "bannerSmallUrl" TEXT NOT NULL,
  "bannerSmallStorageKey" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "thumbnailStorageKey" TEXT NOT NULL,
  "thumbnailSmallUrl" TEXT NOT NULL,
  "thumbnailSmallStorageKey" TEXT NOT NULL,
  "sourceMimeType" TEXT NOT NULL,
  "sourceWidth" INTEGER NOT NULL,
  "sourceHeight" INTEGER NOT NULL,
  "sourceSizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "bannerCrop" JSONB,
  "thumbnailCrop" JSONB,
  "expiresAt" TIMESTAMP(3),
  "attachedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueImageAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Venue_activeImageAssetId_key" ON "Venue"("activeImageAssetId");
CREATE INDEX "VenueImageAsset_ownerUserId_status_createdAt_idx" ON "VenueImageAsset"("ownerUserId", "status", "createdAt");
CREATE INDEX "VenueImageAsset_venueId_status_createdAt_idx" ON "VenueImageAsset"("venueId", "status", "createdAt");
CREATE INDEX "VenueImageAsset_status_expiresAt_idx" ON "VenueImageAsset"("status", "expiresAt");

ALTER TABLE "VenueImageAsset"
ADD CONSTRAINT "VenueImageAsset_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VenueImageAsset"
ADD CONSTRAINT "VenueImageAsset_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Venue"
ADD CONSTRAINT "Venue_activeImageAssetId_fkey"
FOREIGN KEY ("activeImageAssetId") REFERENCES "VenueImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
