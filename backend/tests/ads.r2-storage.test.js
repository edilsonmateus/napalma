import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isR2Configured, uploadCreativeToR2 } from "../src/services/r2Storage.service.js";

const CONFIG = {
  endpoint: "https://account.r2.cloudflarestorage.com",
  accessKeyId: "access",
  secretAccessKey: "secret",
  bucket: "77gira-ads",
  publicBaseUrl: "https://media.77gira.test"
};

describe("Cloudflare R2 creative storage", () => {
  it("requires every credential and the public base URL", () => {
    expect(isR2Configured(CONFIG)).toBe(true);
    expect(isR2Configured({ ...CONFIG, secretAccessKey: "" })).toBe(false);
    expect(isR2Configured({ ...CONFIG, publicBaseUrl: "" })).toBe(false);
  });

  it("uploads immutable content and returns auditable metadata", async () => {
    const buffer = Buffer.from("creative-image");
    const client = { send: vi.fn().mockResolvedValue({ ETag: "etag" }) };
    const item = await uploadCreativeToR2({
      buffer,
      mimeType: "image/webp",
      extension: "webp",
      campaignId: "11111111-1111-4111-8111-111111111111",
      client,
      config: CONFIG
    });

    expect(client.send).toHaveBeenCalledOnce();
    expect(client.send.mock.calls[0][0].input).toEqual(expect.objectContaining({
      Bucket: "77gira-ads",
      Body: buffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable"
    }));
    expect(item.storageProvider).toBe("cloudflare_r2");
    expect(item.storageKey).toMatch(/^ads\/creatives\/11111111-1111-4111-8111-111111111111\/.+\.webp$/);
    expect(item.url).toBe(`https://media.77gira.test/${item.storageKey}`);
    expect(item.fileSizeBytes).toBe(buffer.length);
    expect(item.checksum).toBe(crypto.createHash("sha256").update(buffer).digest("hex"));
  });
});
