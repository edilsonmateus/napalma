import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  attachVenueImageAsset,
  rejectVenueImageAsset,
  validateVenueImageAssetForAttachment
} from "../src/services/venueImageAssets.service.js";

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const VENUE_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_ID = "33333333-3333-4333-8333-333333333333";

function draftAsset(overrides = {}) {
  return {
    id: ASSET_ID,
    ownerUserId: OWNER_ID,
    venueId: VENUE_ID,
    status: "draft",
    expiresAt: new Date(Date.now() + 60_000),
    bannerUrl: "https://media.test/banner.webp",
    bannerMediumUrl: "https://media.test/banner-medium.webp",
    bannerSmallUrl: "https://media.test/banner-small.webp",
    thumbnailUrl: "https://media.test/thumb.webp",
    thumbnailSmallUrl: "https://media.test/thumb-small.webp",
    ...overrides
  };
}

describe("venue image attachment authorization", () => {
  it("refuses an asset owned by another account", async () => {
    const db = { venueImageAsset: { findUnique: vi.fn().mockResolvedValue(draftAsset()) } };
    await expect(validateVenueImageAssetForAttachment(db, {
      assetId: ASSET_ID,
      venueId: VENUE_ID,
      ownerUserId: "44444444-4444-4444-8444-444444444444"
    })).rejects.toMatchObject({ code: "venue_image_asset_owner_mismatch", status: 403 });
  });

  it("publishes all variants and consumes the draft atomically", async () => {
    const tx = {
      venueImageAsset: {
        findUnique: vi.fn().mockResolvedValue(draftAsset()),
        update: vi.fn().mockResolvedValue({})
      },
      venue: { update: vi.fn().mockResolvedValue({}) }
    };
    await attachVenueImageAsset({ tx, assetId: ASSET_ID, venueId: VENUE_ID, ownerUserId: OWNER_ID });
    expect(tx.venue.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ activeImageAssetId: ASSET_ID, bannerImageUrl: expect.any(String), thumbnailImageUrl: expect.any(String) })
    }));
    expect(tx.venueImageAsset.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "attached", expiresAt: null }) }));
  });

  it("marks a refused proposal without touching the public venue", async () => {
    const tx = {
      venueImageAsset: {
        findUnique: vi.fn().mockResolvedValue(draftAsset()),
        update: vi.fn().mockResolvedValue({})
      },
      venue: { update: vi.fn() }
    };
    await rejectVenueImageAsset({ tx, assetId: ASSET_ID, ownerUserId: OWNER_ID });
    expect(tx.venue.update).not.toHaveBeenCalled();
    expect(tx.venueImageAsset.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "rejected" }) }));
  });
});

describe("venue update claim image boundary", () => {
  it("accepts only an asset id and never a submitted public image URL", () => {
    const service = fs.readFileSync(path.join(process.cwd(), "src/services/claimAccess.service.js"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"), "utf8");
    const allowed = service.match(/const allowed = \[(.*?)\];/s)?.[1] || "";
    expect(allowed).not.toContain("imageUrl");
    expect(service).toContain("incoming.venueImageAssetId");
    expect(page).toContain("diff.venueImageAssetId = venueImageAsset.id");
  });
});
