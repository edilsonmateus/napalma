-- Visibilidade de casas é aditiva. Casas existentes recebem o padrão
-- published e permanecem publicadas; dados operacionais não são removidos.

CREATE TYPE "VenueVisibilityStatus" AS ENUM ('draft', 'published', 'paused');

ALTER TABLE "Venue"
  ADD COLUMN "visibilityStatus" "VenueVisibilityStatus" NOT NULL DEFAULT 'published',
  ADD COLUMN "visibilityChangedAt" TIMESTAMP(3);

CREATE INDEX "Venue_visibilityStatus_region_name_idx"
  ON "Venue"("visibilityStatus", "region", "name");
