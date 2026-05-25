-- CreateTable
CREATE TABLE "Region" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Sao Paulo',
  "state" TEXT NOT NULL DEFAULT 'SP',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_city_state_key" ON "Region"("name", "city", "state");
CREATE INDEX "Region_isActive_sortOrder_name_idx" ON "Region"("isActive", "sortOrder", "name");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
