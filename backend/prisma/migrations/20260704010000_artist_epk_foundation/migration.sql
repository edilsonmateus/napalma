CREATE TYPE "ArtistAccessRole" AS ENUM ('owner', 'manager', 'editor', 'viewer');
CREATE TYPE "ArtistAccessStatus" AS ENUM ('invited', 'active', 'suspended', 'revoked');

ALTER TABLE "Artist"
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedByUserId" TEXT;

CREATE TABLE "ArtistProfessionalProfile" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "shortBio" TEXT,
  "fullBio" TEXT,
  "baseCity" TEXT,
  "baseState" TEXT,
  "serviceRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "showFormats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "eventTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "averageDurationMinutes" INTEGER,
  "formation" TEXT,
  "availability" TEXT,
  "websiteUrl" TEXT,
  "tiktokUrl" TEXT,
  "whatsappUrl" TEXT,
  "soundcloudUrl" TEXT,
  "professionalEmail" TEXT,
  "professionalPhone" TEXT,
  "contactPreference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArtistAccess" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ArtistAccessRole" NOT NULL DEFAULT 'viewer',
  "status" "ArtistAccessStatus" NOT NULL DEFAULT 'invited',
  "invitedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtistProfessionalProfile_artistId_key" ON "ArtistProfessionalProfile"("artistId");
CREATE UNIQUE INDEX "ArtistAccess_artistId_userId_key" ON "ArtistAccess"("artistId", "userId");
CREATE INDEX "ArtistAccess_userId_status_idx" ON "ArtistAccess"("userId", "status");
CREATE INDEX "ArtistAccess_artistId_status_idx" ON "ArtistAccess"("artistId", "status");

ALTER TABLE "Artist" ADD CONSTRAINT "Artist_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArtistProfessionalProfile" ADD CONSTRAINT "ArtistProfessionalProfile_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistAccess" ADD CONSTRAINT "ArtistAccess_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistAccess" ADD CONSTRAINT "ArtistAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistAccess" ADD CONSTRAINT "ArtistAccess_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Artist"
SET "verifiedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "isVerified" = true AND "verifiedAt" IS NULL;
