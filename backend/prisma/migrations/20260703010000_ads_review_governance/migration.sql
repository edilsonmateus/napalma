CREATE TYPE "AdReviewStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested');
CREATE TYPE "AdReviewEntityType" AS ENUM ('campaign', 'creative');
CREATE TYPE "AdReviewAction" AS ENUM ('submit', 'approve', 'reject', 'request_changes', 'reopen_after_edit');

ALTER TABLE "AdCampaign"
  ADD COLUMN "reviewStatus" "AdReviewStatus",
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT,
  ADD COLUMN "reviewNotes" TEXT,
  ADD COLUMN "requiresReviewAfterEdit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AdCreative"
  ADD COLUMN "reviewStatus" "AdReviewStatus",
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT,
  ADD COLUMN "reviewNotes" TEXT,
  ADD COLUMN "requiresReviewAfterEdit" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AdReviewLog" (
  "id" TEXT NOT NULL,
  "entityType" "AdReviewEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" "AdReviewAction" NOT NULL,
  "fromStatus" "AdReviewStatus",
  "toStatus" "AdReviewStatus" NOT NULL,
  "actorUserId" TEXT,
  "reason" TEXT,
  "snapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdReviewLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdCampaign_reviewStatus_submittedAt_idx" ON "AdCampaign"("reviewStatus", "submittedAt");
CREATE INDEX "AdCreative_reviewStatus_submittedAt_idx" ON "AdCreative"("reviewStatus", "submittedAt");
CREATE INDEX "AdReviewLog_entityType_entityId_createdAt_idx" ON "AdReviewLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AdReviewLog_actorUserId_createdAt_idx" ON "AdReviewLog"("actorUserId", "createdAt");

ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdReviewLog" ADD CONSTRAINT "AdReviewLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
