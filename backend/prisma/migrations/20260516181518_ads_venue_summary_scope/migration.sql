-- AlterTable
ALTER TABLE "AdEventLog" ADD COLUMN     "venueId" TEXT;

-- CreateIndex
CREATE INDEX "AdEventLog_venueId_type_createdAt_idx" ON "AdEventLog"("venueId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "AdEventLog" ADD CONSTRAINT "AdEventLog_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
