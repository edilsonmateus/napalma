ALTER TABLE "Region" ADD COLUMN "grammarArticle" TEXT;
ALTER TABLE "Region" ADD COLUMN "grammarPreposition" TEXT DEFAULT 'em';
ALTER TABLE "Region" ADD COLUMN "displayNameWithArticle" TEXT;
ALTER TABLE "Region" ADD COLUMN "displayNameWithPreposition" TEXT;

ALTER TABLE "Venue" ADD COLUMN "grammarArticle" TEXT;
ALTER TABLE "Venue" ADD COLUMN "grammarPreposition" TEXT DEFAULT 'em';
ALTER TABLE "Venue" ADD COLUMN "displayNameWithArticle" TEXT;
ALTER TABLE "Venue" ADD COLUMN "displayNameWithPreposition" TEXT;
ALTER TABLE "Venue" ADD COLUMN "neighborhoodGrammarArticle" TEXT;
ALTER TABLE "Venue" ADD COLUMN "neighborhoodGrammarPreposition" TEXT DEFAULT 'em';
ALTER TABLE "Venue" ADD COLUMN "neighborhoodDisplayNameWithArticle" TEXT;
ALTER TABLE "Venue" ADD COLUMN "neighborhoodDisplayNameWithPreposition" TEXT;
