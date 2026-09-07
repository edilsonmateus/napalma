import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findVenue: vi.fn(),
  createAsset: vi.fn(),
  processImage: vi.fn(),
  upload: vi.fn()
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    venue: { findUnique: mocks.findVenue },
    venueImageAsset: { create: mocks.createAsset }
  }
}));
vi.mock("../src/services/venueImageProcessing.service.js", () => ({
  normalizeVenueImageCrop: (value) => ({ x: Number(value?.x ?? 0.5), y: Number(value?.y ?? 0.5), zoom: Number(value?.zoom ?? 1) }),
  processVenueImage: mocks.processImage
}));
vi.mock("../src/services/r2Storage.service.js", () => ({
  uploadBufferToR2: mocks.upload,
  deleteObjectsFromR2: vi.fn()
}));

import { createVenueImageAsset } from "../src/controllers/venueImageAssets.controller.js";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.processImage.mockResolvedValue({
    source: { buffer: Buffer.from("source"), originalMimeType: "image/jpeg", originalSizeBytes: 80_000, width: 1600, height: 900 },
    banner: { buffer: Buffer.from("banner") },
    bannerMedium: { buffer: Buffer.from("medium") },
    bannerSmall: { buffer: Buffer.from("small") },
    thumbnail: { buffer: Buffer.from("thumb") },
    thumbnailSmall: { buffer: Buffer.from("thumb-small") }
  });
  let counter = 0;
  mocks.upload.mockImplementation(async () => {
    counter += 1;
    return { url: `https://media.test/${counter}.webp`, storageKey: `venues/${counter}.webp` };
  });
  mocks.createAsset.mockImplementation(async ({ data }) => data);
});

describe("venue image asset upload authorization", () => {
  it("requires a target venue for a non-admin user", async () => {
    const res = response();
    await createVenueImageAsset({
      user: { id: USER_ID, role: "venue_manager" },
      file: { buffer: Buffer.from("image"), size: 80_000 },
      body: {}
    }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.processImage).not.toHaveBeenCalled();
  });

  it("refuses a venue that is not managed by the uploader", async () => {
    mocks.findVenue.mockResolvedValue({
      id: VENUE_ID,
      managerUserId: null,
      createdByUserId: null,
      managerAccesses: [],
      producerAccesses: []
    });
    const res = response();
    await createVenueImageAsset({
      user: { id: USER_ID, role: "venue_manager" },
      file: { buffer: Buffer.from("image"), size: 80_000 },
      body: { venueId: VENUE_ID }
    }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("returns only public asset metadata after a valid admin upload", async () => {
    const res = response();
    await createVenueImageAsset({
      user: { id: USER_ID, role: "admin" },
      file: { buffer: Buffer.from("image"), size: 80_000 },
      body: { bannerMode: "cover" }
    }, res, vi.fn());

    expect(mocks.upload).toHaveBeenCalledTimes(6);
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0].item;
    expect(payload.bannerUrl).toMatch(/^https:\/\/media\.test\//);
    expect(payload).not.toHaveProperty("bannerStorageKey");
    expect(payload).not.toHaveProperty("checksum");
  });
});
