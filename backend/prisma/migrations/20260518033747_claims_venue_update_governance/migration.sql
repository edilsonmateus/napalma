-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "ClaimRequest" ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'ownership',
ADD COLUMN     "requestedChanges" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "instagramUrl" TEXT;
