import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function frontend(file) {
  return fs.readFileSync(path.join(process.cwd(), "../frontend/src/pages", file), "utf8");
}

describe("venue image responsive rendering", () => {
  it("uses a responsive 16:9 banner with legacy fallback on the public profile", () => {
    const page = frontend("VenueDetailFlowPage.jsx");
    const css = fs.readFileSync(path.join(process.cwd(), "../frontend/src/styles/globals.css"), "utf8");
    expect(page).toContain("venue.images?.banner || venue.bannerImageUrl || venue.imageUrl");
    expect(page).toContain("srcSet=");
    expect(page).toContain('sizes="(max-width: 760px) 100vw, 960px"');
    expect(css).toMatch(/\.venue-detail-banner\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  });

  it("uses thumbnails in the claim directory and administrative detail", () => {
    const directory = frontend("VenueClaimDirectoryPage.jsx");
    const admin = frontend("VenueAdminDetailPage.jsx");
    expect(directory).toContain("venue.images?.thumbnail || venue.thumbnailImageUrl || venue.imageUrl");
    expect(directory).toContain('sizes="48px"');
    expect(admin).toContain("venue.presentation.thumbnailImageUrl || venue.presentation.imageUrl");
    expect(admin).toContain('sizes="82px"');
  });
});
