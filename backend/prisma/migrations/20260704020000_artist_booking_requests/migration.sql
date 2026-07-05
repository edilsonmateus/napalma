CREATE TYPE "ArtistBookingStatus" AS ENUM ('new', 'in_conversation', 'proposal_sent', 'won', 'lost', 'archived', 'spam');

CREATE TABLE "ArtistBookingRequest" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "requesterUserId" TEXT,
  "requesterName" TEXT NOT NULL,
  "requesterEmail" TEXT NOT NULL,
  "requesterPhone" TEXT,
  "desiredDate" TIMESTAMP(3),
  "city" TEXT NOT NULL,
  "neighborhood" TEXT,
  "eventType" TEXT NOT NULL,
  "estimatedAudience" INTEGER,
  "budgetRange" TEXT,
  "message" TEXT NOT NULL,
  "status" "ArtistBookingStatus" NOT NULL DEFAULT 'new',
  "source" TEXT NOT NULL DEFAULT 'artist_epk',
  "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistBookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArtistBookingRequest_artistId_status_createdAt_idx" ON "ArtistBookingRequest"("artistId", "status", "createdAt");
CREATE INDEX "ArtistBookingRequest_requesterUserId_createdAt_idx" ON "ArtistBookingRequest"("requesterUserId", "createdAt");
ALTER TABLE "ArtistBookingRequest" ADD CONSTRAINT "ArtistBookingRequest_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistBookingRequest" ADD CONSTRAINT "ArtistBookingRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
