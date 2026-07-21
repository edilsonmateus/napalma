import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("../src/services/r2Storage.service.js", () => ({ uploadBufferToR2: mocks.upload }));
const originalNodeEnv = process.env.NODE_ENV;

import { uploadImage } from "../src/controllers/uploads.controller.js";

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.R2_SHARED_UPLOADS_ENABLED = "true";
  mocks.upload.mockResolvedValue({
    url: "https://media.77gira.test/venues/image.webp",
    storageProvider: "cloudflare_r2",
    storageKey: "venues/image.webp",
    mimeType: "image/webp",
    fileSizeBytes: 123,
    checksum: "a".repeat(64),
    assetVersion: 1
  });
});

afterEach(() => {
  delete process.env.R2_SHARED_UPLOADS_ENABLED;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe("shared image uploads", () => {
  it("sends existing venue uploads to their R2 prefix", async () => {
    const buffer = await sharp({ create: { width: 320, height: 180, channels: 3, background: "#000" } }).webp().toBuffer();
    const res = response();
    await uploadImage(
      { file: { buffer, originalname: "casa.webp", size: buffer.length }, body: { folder: "venues" } },
      res,
      vi.fn()
    );
    expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({
      buffer,
      mimeType: "image/webp",
      extension: "webp",
      keyPrefix: "venues"
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      item: expect.objectContaining({ path: "venues/image.webp", width: 320, height: 180 })
    });
  });

  it("detects invalid content instead of trusting the browser MIME type", async () => {
    const res = response();
    await uploadImage(
      { file: { buffer: Buffer.from("not-an-image"), mimetype: "image/png" }, body: { folder: "artists" } },
      res,
      vi.fn()
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_image" }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("refuses ephemeral local storage in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.R2_SHARED_UPLOADS_ENABLED = "false";
    const buffer = await sharp({ create: { width: 320, height: 180, channels: 3, background: "#000" } }).webp().toBuffer();
    const res = response();

    await uploadImage(
      { file: { buffer, originalname: "casa.webp", size: buffer.length }, body: { folder: "venues" } },
      res,
      vi.fn()
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "shared_storage_unavailable" }));
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
