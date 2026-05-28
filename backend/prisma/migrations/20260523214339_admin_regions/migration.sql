-- AlterTable (safe when Region does not exist yet in shadow DB)
ALTER TABLE IF EXISTS "Region" ALTER COLUMN "updatedAt" DROP DEFAULT;
