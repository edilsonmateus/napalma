CREATE TYPE "ArtistMediaType" AS ENUM ('photo', 'video_external');

CREATE TABLE "ArtistMedia" (
  "id" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "type" "ArtistMediaType" NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "title" TEXT,
  "caption" TEXT,
  "altText" TEXT,
  "storageProvider" TEXT,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "fileSizeBytes" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArtistMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArtistMedia_artistId_type_isPublished_sortOrder_idx" ON "ArtistMedia"("artistId", "type", "isPublished", "sortOrder");
ALTER TABLE "ArtistMedia" ADD CONSTRAINT "ArtistMedia_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
