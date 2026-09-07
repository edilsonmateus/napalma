import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  calculateVenueImageExtract,
  processVenueImage,
  VENUE_IMAGE_VARIANTS
} from "../src/services/venueImageProcessing.service.js";

async function metadata(buffer) {
  return sharp(buffer).metadata();
}

describe("venue image processing", () => {
  it("calculates bounded cover crops", () => {
    expect(calculateVenueImageExtract(900, 1600, 1600, 900, { x: 0.5, y: 0.5, zoom: 1 })).toEqual({
      left: 0,
      top: 547,
      width: 900,
      height: 506
    });
    const zoomed = calculateVenueImageExtract(2000, 1000, 640, 640, { x: 1, y: 1, zoom: 2 });
    expect(zoomed.left + zoomed.width).toBeLessThanOrEqual(2000);
    expect(zoomed.top + zoomed.height).toBeLessThanOrEqual(1000);
  });

  it("creates exact WebP cover and thumbnail variants", async () => {
    const input = await sharp({
      create: { width: 900, height: 1600, channels: 3, background: "#7c3aed" }
    }).jpeg().toBuffer();
    const result = await processVenueImage({ buffer: input, bannerMode: "cover" });

    for (const [name, target] of Object.entries(VENUE_IMAGE_VARIANTS)) {
      const info = await metadata(result[name].buffer);
      expect(info).toMatchObject({ format: "webp", width: target.width, height: target.height });
    }
  });

  it("supports the contained image over a blurred banner background", async () => {
    const input = await sharp({
      create: { width: 700, height: 1100, channels: 3, background: "#f59e0b" }
    }).png().toBuffer();
    const result = await processVenueImage({ buffer: input, bannerMode: "contain_blur" });
    expect(await metadata(result.banner.buffer)).toMatchObject({ format: "webp", width: 1600, height: 900 });
  });

  it("rejects formats outside JPG, PNG and WebP", async () => {
    const gif = await sharp({
      create: { width: 80, height: 80, channels: 3, background: "#000" }
    }).gif().toBuffer();
    await expect(processVenueImage({ buffer: gif })).rejects.toMatchObject({ code: "invalid_file_type" });
  });
});
