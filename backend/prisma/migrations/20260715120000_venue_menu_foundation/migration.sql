ALTER TYPE "AdSlot" ADD VALUE IF NOT EXISTS 'venue_menu_sponsor';

CREATE TYPE "VenueMenuStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "VenueMenuItemStatus" AS ENUM ('draft', 'published', 'unavailable', 'archived');
CREATE TYPE "VenueMenuPriceMode" AS ENUM ('exact', 'from', 'hidden', 'consultation');
CREATE TYPE "VenueMenuInteractionType" AS ENUM ('want_to_try', 'recommend', 'save');
CREATE TYPE "VenueAdRestrictionType" AS ENUM ('block_category', 'block_advertiser', 'exclusive_advertiser');

ALTER TABLE "AdvertiserAccount" ADD COLUMN "commercialCategory" TEXT;

CREATE TABLE "VenueMenu" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "status" "VenueMenuStatus" NOT NULL DEFAULT 'draft',
  "pricesVisible" BOOLEAN NOT NULL DEFAULT true,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueMenu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueMenuItem" (
  "id" TEXT NOT NULL,
  "menuId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceCents" INTEGER,
  "priceMode" "VenueMenuPriceMode" NOT NULL DEFAULT 'exact',
  "servingLabel" TEXT,
  "status" "VenueMenuItemStatus" NOT NULL DEFAULT 'draft',
  "tags" TEXT[],
  "isHighlight" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueMenuItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueMenuInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" "VenueMenuInteractionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VenueMenuInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueAdRestriction" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "type" "VenueAdRestrictionType" NOT NULL,
  "commercialCategory" TEXT,
  "brandName" TEXT,
  "advertiserAccountId" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueAdRestriction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueMenu_venueId_key" ON "VenueMenu"("venueId");
CREATE INDEX "VenueMenu_status_updatedAt_idx" ON "VenueMenu"("status", "updatedAt");
CREATE INDEX "VenueMenuItem_menuId_status_category_sortOrder_idx" ON "VenueMenuItem"("menuId", "status", "category", "sortOrder");
CREATE UNIQUE INDEX "VenueMenuInteraction_userId_itemId_type_key" ON "VenueMenuInteraction"("userId", "itemId", "type");
CREATE INDEX "VenueMenuInteraction_itemId_type_idx" ON "VenueMenuInteraction"("itemId", "type");
CREATE INDEX "VenueMenuInteraction_userId_createdAt_idx" ON "VenueMenuInteraction"("userId", "createdAt");
CREATE INDEX "VenueAdRestriction_venueId_isActive_startsAt_endsAt_idx" ON "VenueAdRestriction"("venueId", "isActive", "startsAt", "endsAt");
CREATE INDEX "VenueAdRestriction_advertiserAccountId_isActive_idx" ON "VenueAdRestriction"("advertiserAccountId", "isActive");
CREATE INDEX "VenueAdRestriction_commercialCategory_isActive_idx" ON "VenueAdRestriction"("commercialCategory", "isActive");

ALTER TABLE "VenueMenu" ADD CONSTRAINT "VenueMenu_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueMenu" ADD CONSTRAINT "VenueMenu_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueMenuItem" ADD CONSTRAINT "VenueMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "VenueMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueMenuInteraction" ADD CONSTRAINT "VenueMenuInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueMenuInteraction" ADD CONSTRAINT "VenueMenuInteraction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VenueMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueAdRestriction" ADD CONSTRAINT "VenueAdRestriction_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueAdRestriction" ADD CONSTRAINT "VenueAdRestriction_advertiserAccountId_fkey" FOREIGN KEY ("advertiserAccountId") REFERENCES "AdvertiserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueAdRestriction" ADD CONSTRAINT "VenueAdRestriction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
