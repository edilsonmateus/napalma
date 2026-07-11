-- Existing requests remain nullable. New requests receive a deadline in the application layer.
ALTER TABLE "PrivacyRequest" ADD COLUMN "dueAt" TIMESTAMP(3);

CREATE INDEX "PrivacyRequest_status_dueAt_idx" ON "PrivacyRequest"("status", "dueAt");
