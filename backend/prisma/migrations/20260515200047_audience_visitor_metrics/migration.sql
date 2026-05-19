-- CreateTable
CREATE TABLE "AudienceVisitor" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hits" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AudienceVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudienceVisitor_visitorId_key" ON "AudienceVisitor"("visitorId");

-- CreateIndex
CREATE INDEX "AudienceVisitor_lastSeenAt_idx" ON "AudienceVisitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AudienceVisitor_userId_idx" ON "AudienceVisitor"("userId");

-- AddForeignKey
ALTER TABLE "AudienceVisitor" ADD CONSTRAINT "AudienceVisitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
