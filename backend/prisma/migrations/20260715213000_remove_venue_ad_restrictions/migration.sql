-- A casa administra o conteudo do cardapio; o 77Gira administra o inventario publicitario.
DROP TABLE IF EXISTS "VenueAdRestriction";
DROP TYPE IF EXISTS "VenueAdRestrictionType";

ALTER TABLE "VenueMenu"
  ADD COLUMN "adInventoryAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "adInventoryAcceptedByUserId" TEXT,
  ADD COLUMN "adInventoryPolicyVersion" TEXT;

ALTER TABLE "VenueMenu"
  ADD CONSTRAINT "VenueMenu_adInventoryAcceptedByUserId_fkey"
  FOREIGN KEY ("adInventoryAcceptedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
