CREATE TABLE "AcquisitionLead" (
    "id" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'São Paulo',
    "region" TEXT,
    "neighborhood" TEXT,
    "instagramUrl" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "contactRole" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'mapped',
    "temperature" TEXT NOT NULL DEFAULT 'warm',
    "nextFollowUpAt" TIMESTAMP(3),
    "presentationAt" TIMESTAMP(3),
    "presentationFormat" TEXT,
    "source" TEXT,
    "potential" TEXT,
    "objections" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcquisitionInteraction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'note',
    "summary" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcquisitionLead_status_idx" ON "AcquisitionLead"("status");
CREATE INDEX "AcquisitionLead_temperature_idx" ON "AcquisitionLead"("temperature");
CREATE INDEX "AcquisitionLead_nextFollowUpAt_idx" ON "AcquisitionLead"("nextFollowUpAt");
CREATE INDEX "AcquisitionLead_city_region_idx" ON "AcquisitionLead"("city", "region");
CREATE INDEX "AcquisitionInteraction_leadId_createdAt_idx" ON "AcquisitionInteraction"("leadId", "createdAt");
CREATE INDEX "AcquisitionInteraction_nextFollowUpAt_idx" ON "AcquisitionInteraction"("nextFollowUpAt");

ALTER TABLE "AcquisitionLead" ADD CONSTRAINT "AcquisitionLead_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcquisitionInteraction" ADD CONSTRAINT "AcquisitionInteraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AcquisitionLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcquisitionInteraction" ADD CONSTRAINT "AcquisitionInteraction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
