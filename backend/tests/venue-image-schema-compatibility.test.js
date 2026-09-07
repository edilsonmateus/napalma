import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
const controller = fs.readFileSync(path.join(process.cwd(), "src/controllers/venues.controller.js"), "utf8");
const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260907194500_venue_image_assets/migration.sql"),
  "utf8"
);

describe("venue image schema compatibility", () => {
  it("adds nullable variants while preserving the legacy image field", () => {
    expect(schema).toContain("imageUrl                               String?");
    expect(schema).toContain("bannerImageUrl");
    expect(schema).toContain("thumbnailImageUrl");
    expect(schema).toContain("model VenueImageAsset");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
  });

  it("keeps legacy images as read fallbacks", () => {
    expect(controller).toContain("venue.bannerImageUrl || venue.imageUrl");
    expect(controller).toContain("venue.thumbnailImageUrl || venue.imageUrl");
  });
});
