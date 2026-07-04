import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Ads creative storage metadata schema", () => {
  it("adds optional R2 metadata while preserving imageUrl", () => {
    const creative = Prisma.dmmf.datamodel.models.find((model) => model.name === "AdCreative");
    const fields = Object.fromEntries(creative.fields.map((field) => [field.name, field]));
    expect(fields.imageUrl.isRequired).toBe(true);
    for (const name of ["storageProvider", "storageKey", "mimeType", "fileSizeBytes", "checksum"]) {
      expect(fields[name].isRequired).toBe(false);
    }
    expect(fields.assetVersion.isRequired).toBe(true);
  });

  it("keeps the storage migration additive", () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, "../prisma/migrations/20260629190000_ads_creative_storage_metadata/migration.sql"),
      "utf8"
    );
    expect(sql).toContain('ALTER TABLE "AdCreative"');
    expect(sql).toContain('ADD COLUMN "storageProvider" TEXT');
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|TYPE)\b/i);
    expect(sql).not.toMatch(/\b(DELETE|TRUNCATE|UPDATE)\b/i);
  });
});
