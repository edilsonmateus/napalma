-- Identifica fixtures demonstrativas sem alterar ou remover eventos existentes.
ALTER TABLE "Event"
ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_isDemo_startDate_idx"
ON "Event"("isDemo", "startDate");
