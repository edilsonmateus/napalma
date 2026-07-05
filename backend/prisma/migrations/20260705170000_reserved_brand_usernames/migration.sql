ALTER TABLE "User"
ADD COLUMN "canUseReservedBrandUsername" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reservedUsernameGrantedByUserId" TEXT,
ADD COLUMN "reservedUsernameGrantedAt" TIMESTAMP(3);
