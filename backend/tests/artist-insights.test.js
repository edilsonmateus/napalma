import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("artist insights and discovery", () => {
  it("indexes artist analytics and accepts EPK events", () => {
    expect(read("prisma/schema.prisma")).toContain("@@index([artistId, type, createdAt])");
    const analytics = read("src/controllers/analytics.controller.js");
    expect(analytics).toContain('"artist_profile_view"');
    expect(analytics).toContain('"artist_booking_click"');
  });

  it("protects private insights with auth, flag and ownership", () => {
    const routes = read("src/routes/index.js");
    expect(routes).toContain('router.get("/me/artists/:artistId/insights", requireAuth, requireFeatureFlag("ARTIST_INSIGHTS_ENABLED")');
    expect(read("src/controllers/artistInsights.controller.js")).toContain("canManageArtist(req.user, artist)");
  });

  it("returns related verified artists without exposing private contact data", () => {
    const epk = read("src/controllers/artistEpk.controller.js");
    expect(epk).toContain("relatedArtists");
    expect(epk).toContain("isVerified: true, genres: { hasSome: artist.genres }");
    expect(epk).not.toContain("relatedArtists: { professionalEmail");
  });
});
