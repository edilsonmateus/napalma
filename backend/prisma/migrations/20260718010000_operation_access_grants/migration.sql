-- Granular internal access for the Operations Center. Existing admins retain
-- their full role-based access; no user receives a new permission by default.
CREATE TYPE "OperationScope" AS ENUM ('privacy', 'claims', 'catalog', 'notifications', 'audit', 'settings');

CREATE TABLE "OperationAccessGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scope" "OperationScope" NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "OperationAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationAccessGrant_userId_scope_key" ON "OperationAccessGrant"("userId", "scope");
CREATE INDEX "OperationAccessGrant_userId_revokedAt_idx" ON "OperationAccessGrant"("userId", "revokedAt");
CREATE INDEX "OperationAccessGrant_scope_revokedAt_idx" ON "OperationAccessGrant"("scope", "revokedAt");

ALTER TABLE "OperationAccessGrant" ADD CONSTRAINT "OperationAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationAccessGrant" ADD CONSTRAINT "OperationAccessGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
