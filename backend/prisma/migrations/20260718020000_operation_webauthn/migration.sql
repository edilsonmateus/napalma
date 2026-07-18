CREATE TABLE "OperationWebAuthnCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "transports" JSONB,
  "deviceType" TEXT,
  "backedUp" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "OperationWebAuthnCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OperationWebAuthnCredential_credentialId_key" ON "OperationWebAuthnCredential"("credentialId");
CREATE INDEX "OperationWebAuthnCredential_userId_createdAt_idx" ON "OperationWebAuthnCredential"("userId", "createdAt");
ALTER TABLE "OperationWebAuthnCredential" ADD CONSTRAINT "OperationWebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OperationWebAuthnChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationWebAuthnChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OperationWebAuthnChallenge_userId_purpose_key" ON "OperationWebAuthnChallenge"("userId", "purpose");
CREATE INDEX "OperationWebAuthnChallenge_expiresAt_idx" ON "OperationWebAuthnChallenge"("expiresAt");
ALTER TABLE "OperationWebAuthnChallenge" ADD CONSTRAINT "OperationWebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
