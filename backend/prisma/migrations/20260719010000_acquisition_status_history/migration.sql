CREATE TABLE "AcquisitionStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcquisitionStatusHistory_leadId_changedAt_idx"
ON "AcquisitionStatusHistory"("leadId", "changedAt");

CREATE INDEX "AcquisitionStatusHistory_toStatus_changedAt_idx"
ON "AcquisitionStatusHistory"("toStatus", "changedAt");

CREATE INDEX "AcquisitionStatusHistory_changedByUserId_changedAt_idx"
ON "AcquisitionStatusHistory"("changedByUserId", "changedAt");

ALTER TABLE "AcquisitionStatusHistory"
ADD CONSTRAINT "AcquisitionStatusHistory_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "AcquisitionLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcquisitionStatusHistory"
ADD CONSTRAINT "AcquisitionStatusHistory_changedByUserId_fkey"
FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
