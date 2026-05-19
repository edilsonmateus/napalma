-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "consumacaoValue" DOUBLE PRECISION,
ADD COLUMN     "couvertArtistico" DOUBLE PRECISION,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricingPolicy" JSONB,
ADD COLUMN     "recurrenceDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "recurrenceEndTime" TEXT,
ADD COLUMN     "recurrenceExceptions" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
ADD COLUMN     "recurrenceStartTime" TEXT,
ADD COLUMN     "recurrenceUntil" TIMESTAMP(3);
