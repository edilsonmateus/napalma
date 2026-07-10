import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCampaign: vi.fn(),
  upload: vi.fn()
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: { adCampaign: { findUnique: mocks.findCampaign } }
}));
vi.mock("../src/services/r2Storage.service.js", () => ({
  uploadCreativeToR2: mocks.upload
}));

import { uploadAdCreativeAsset } from "../src/controllers/adCreativeUploads.controller.js";

const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findCampaign.mockResolvedValue({ id: CAMPAIGN_ID });
  mocks.upload.mockResolvedValue({ url: "https://media.test/creative.webp", storageProvider: "cloudflare_r2" });
});

describe("Ads creative R2 upload validation", () => {
  it("rejects an image outside the placement aspect ratio", async () => {
    const buffer = await sharp({ create: { width: 500, height: 500, channels: 3, background: "#000" } }).webp().toBuffer();
    const res = response();
    await uploadAdCreativeAsset(
      { file: { buffer }, body: { campaignId: CAMPAIGN_ID, slot: "explore_feed_large" } },
      res,
      vi.fn()
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_aspect_ratio" }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads a valid image using its detected format and dimensions", async () => {
    const buffer = await sharp({ create: { width: 580, height: 350, channels: 3, background: "#000" } }).webp().toBuffer();
    const res = response();
    await uploadAdCreativeAsset(
      { file: { buffer }, body: { campaignId: CAMPAIGN_ID, slot: "explore_feed_large" } },
      res,
      vi.fn()
    );
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({
      buffer,
      mimeType: "image/webp",
      extension: "webp",
      campaignId: CAMPAIGN_ID
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      item: expect.objectContaining({ width: 580, height: 350, slot: "explore_feed_large" })
    });
  });
});
