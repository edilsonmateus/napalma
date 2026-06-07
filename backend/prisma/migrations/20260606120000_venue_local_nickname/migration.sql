ALTER TABLE "Venue"
ADD COLUMN "nickname" TEXT,
ADD COLUMN "nicknameGrammarArticle" TEXT,
ADD COLUMN "nicknameGrammarPreposition" TEXT DEFAULT 'em',
ADD COLUMN "nicknameDisplayNameWithArticle" TEXT,
ADD COLUMN "nicknameDisplayNameWithPreposition" TEXT;
