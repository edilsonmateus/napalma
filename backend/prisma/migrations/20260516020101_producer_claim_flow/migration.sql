-- CreateEnum
CREATE TYPE "ClaimTargetType" AS ENUM ('venue', 'artist');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "ProducerVenueAccess" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProducerVenueAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProducerArtistAccess" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProducerArtistAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "targetType" "ClaimTargetType" NOT NULL,
    "venueId" TEXT,
    "artistId" TEXT,
    "justification" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProducerVenueAccess_producerId_idx" ON "ProducerVenueAccess"("producerId");

-- CreateIndex
CREATE INDEX "ProducerVenueAccess_venueId_idx" ON "ProducerVenueAccess"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "ProducerVenueAccess_producerId_venueId_key" ON "ProducerVenueAccess"("producerId", "venueId");

-- CreateIndex
CREATE INDEX "ProducerArtistAccess_producerId_idx" ON "ProducerArtistAccess"("producerId");

-- CreateIndex
CREATE INDEX "ProducerArtistAccess_artistId_idx" ON "ProducerArtistAccess"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "ProducerArtistAccess_producerId_artistId_key" ON "ProducerArtistAccess"("producerId", "artistId");

-- CreateIndex
CREATE INDEX "ClaimRequest_requestedById_status_idx" ON "ClaimRequest"("requestedById", "status");

-- CreateIndex
CREATE INDEX "ClaimRequest_targetType_status_idx" ON "ClaimRequest"("targetType", "status");

-- AddForeignKey
ALTER TABLE "ProducerVenueAccess" ADD CONSTRAINT "ProducerVenueAccess_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerVenueAccess" ADD CONSTRAINT "ProducerVenueAccess_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerArtistAccess" ADD CONSTRAINT "ProducerArtistAccess_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerArtistAccess" ADD CONSTRAINT "ProducerArtistAccess_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
