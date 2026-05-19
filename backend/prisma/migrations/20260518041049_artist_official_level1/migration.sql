-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ArtistFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistFollow_artistId_createdAt_idx" ON "ArtistFollow"("artistId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistFollow_userId_artistId_key" ON "ArtistFollow"("userId", "artistId");

-- AddForeignKey
ALTER TABLE "ArtistFollow" ADD CONSTRAINT "ArtistFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistFollow" ADD CONSTRAINT "ArtistFollow_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
