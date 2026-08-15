ALTER TYPE "ClaimStatus" ADD VALUE IF NOT EXISTS 'pending_legal_acceptance';
ALTER TYPE "ClaimStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "ClaimRequest"
ADD COLUMN "legalEnvelopeId" TEXT,
ADD COLUMN "accessActivatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ClaimRequest_legalEnvelopeId_key" ON "ClaimRequest"("legalEnvelopeId");

ALTER TABLE "ClaimRequest"
ADD CONSTRAINT "ClaimRequest_legalEnvelopeId_fkey"
FOREIGN KEY ("legalEnvelopeId") REFERENCES "LegalSignatureEnvelope"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
