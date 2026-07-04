ALTER TABLE "AdCreative"
ADD COLUMN "storageProvider" TEXT,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSizeBytes" INTEGER,
ADD COLUMN "checksum" TEXT,
ADD COLUMN "assetVersion" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "AdCreative_storageProvider_storageKey_idx"
ON "AdCreative"("storageProvider", "storageKey");
