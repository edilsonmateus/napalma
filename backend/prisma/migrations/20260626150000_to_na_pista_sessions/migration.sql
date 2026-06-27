CREATE TABLE "ToNaPistaSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxNotifications" INTEGER NOT NULL DEFAULT 2,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToNaPistaSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToNaPistaDelivery" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToNaPistaDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ToNaPistaSession_userId_isActive_expiresAt_idx"
ON "ToNaPistaSession"("userId", "isActive", "expiresAt");

CREATE INDEX "ToNaPistaSession_visitorId_isActive_expiresAt_idx"
ON "ToNaPistaSession"("visitorId", "isActive", "expiresAt");

CREATE UNIQUE INDEX "ToNaPistaDelivery_sessionId_eventId_key"
ON "ToNaPistaDelivery"("sessionId", "eventId");

CREATE INDEX "ToNaPistaDelivery_eventId_sentAt_idx"
ON "ToNaPistaDelivery"("eventId", "sentAt");

ALTER TABLE "ToNaPistaSession"
ADD CONSTRAINT "ToNaPistaSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ToNaPistaDelivery"
ADD CONSTRAINT "ToNaPistaDelivery_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ToNaPistaSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToNaPistaDelivery"
ADD CONSTRAINT "ToNaPistaDelivery_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
