import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const schema = fs.readFileSync(path.join(root, "backend/prisma/schema.prisma"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/artistMedia.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const gallery = fs.readFileSync(path.join(root, "frontend/src/components/artists/ArtistGallery.jsx"), "utf8");

describe("artist media gallery", () => {
  it("separates photos from external videos", () => {
    expect(schema).toContain("enum ArtistMediaType");
    expect(schema).toContain("video_external");
    expect(schema).toContain("model ArtistMedia");
  });

  it("limits storage and external providers", () => {
    expect(controller).toContain('const LIMITS = { photo: 12, video_external: 6 }');
    expect(controller).toContain('storageProvider: z.literal("r2")');
    expect(controller).toContain('"youtube.com"');
    expect(controller).toContain('"tiktok.com"');
  });

  it("protects every mutation with authentication and feature flag", () => {
    expect(routes).toContain('router.post("/me/artists/:artistId/media", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED")');
    expect(routes).toContain('router.delete("/me/artist-media/:id", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED")');
  });

  it("uses lazy-loaded public photos and safe external links", () => {
    expect(gallery).toContain('loading="lazy"');
    expect(gallery).toContain('target="_blank" rel="noreferrer"');
  });
});
