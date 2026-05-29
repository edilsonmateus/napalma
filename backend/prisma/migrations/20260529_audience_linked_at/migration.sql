ALTER TABLE "AudienceVisitor"
ADD COLUMN IF NOT EXISTS "linkedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AudienceVisitor_linkedAt_idx"
ON "AudienceVisitor"("linkedAt");
