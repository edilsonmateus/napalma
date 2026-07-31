-- Lembretes transacionais de eventos salvos no Radar.
CREATE TYPE "EventReminderType" AS ENUM ('EVENT_START_3H');
CREATE TYPE "EventReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED');

ALTER TABLE "User" ADD COLUMN "radarEventRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PushSubscription"
  ADD COLUMN "deviceLabel" TEXT,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "disabledAt" TIMESTAMP(3);

CREATE TABLE "EventReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" "EventReminderType" NOT NULL DEFAULT 'EVENT_START_3H',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "EventReminderStatus" NOT NULL DEFAULT 'PENDING',
  "eventStartSnapshot" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventReminderDelivery" (
  "id" TEXT NOT NULL,
  "reminderId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "providerStatus" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventReminder_userId_eventId_type_key" ON "EventReminder"("userId", "eventId", "type");
CREATE INDEX "EventReminder_status_scheduledFor_idx" ON "EventReminder"("status", "scheduledFor");
CREATE INDEX "EventReminder_eventId_status_idx" ON "EventReminder"("eventId", "status");
CREATE UNIQUE INDEX "EventReminderDelivery_reminderId_subscriptionId_key" ON "EventReminderDelivery"("reminderId", "subscriptionId");
CREATE INDEX "EventReminderDelivery_reminderId_createdAt_idx" ON "EventReminderDelivery"("reminderId", "createdAt");

ALTER TABLE "EventReminder"
  ADD CONSTRAINT "EventReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EventReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventReminderDelivery"
  ADD CONSTRAINT "EventReminderDelivery_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "EventReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EventReminderDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
