CREATE TYPE "StrategicPartnerType" AS ENUM ('operation', 'project', 'activation', 'institutional', 'other');
CREATE TYPE "StrategicPartnerStatus" AS ENUM ('prospect', 'negotiating', 'active', 'paused', 'closed');

ALTER TYPE "OperationScope" ADD VALUE IF NOT EXISTS 'partners';

CREATE TABLE "StrategicPartner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logoUrl" TEXT,
  "publicDescription" VARCHAR(600),
  "internalNotes" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "partnershipType" "StrategicPartnerType" NOT NULL DEFAULT 'other',
  "counterpartAgreements" TEXT,
  "status" "StrategicPartnerStatus" NOT NULL DEFAULT 'prospect',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isPermanent" BOOLEAN NOT NULL DEFAULT false,
  "publicVisible" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "initiativeName" TEXT,
  "destinationUrl" TEXT,
  "activationStartsAt" TIMESTAMP(3),
  "activationEndsAt" TIMESTAMP(3),
  "canAppearAsSupporter" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrategicPartner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategicPartner_status_publicVisible_displayOrder_idx" ON "StrategicPartner"("status", "publicVisible", "displayOrder");
CREATE INDEX "StrategicPartner_endsAt_idx" ON "StrategicPartner"("endsAt");
