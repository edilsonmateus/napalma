import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredVenueImageAssets } from "../src/services/venueImageCleanup.service.js";

describe("expired venue image cleanup", () => {
  it("deletes R2 objects before conditionally removing expired drafts", async () => {
    const asset = {
      id: "asset-1",
      originalStorageKey: "source",
      bannerStorageKey: "banner",
      bannerMediumStorageKey: "banner-medium",
      bannerSmallStorageKey: "banner-small",
      thumbnailStorageKey: "thumbnail",
      thumbnailSmallStorageKey: "thumbnail-small"
    };
    const db = {
      venueImageAsset: {
        findMany: vi.fn().mockResolvedValue([asset]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };
    const deleteObjects = vi.fn().mockResolvedValue({ deleted: 6 });
    const result = await cleanupExpiredVenueImageAssets({ db, deleteObjects, now: new Date("2026-09-07T12:00:00Z") });
    expect(deleteObjects).toHaveBeenCalledWith(["source", "banner", "banner-medium", "banner-small", "thumbnail", "thumbnail-small"]);
    expect(db.venueImageAsset.deleteMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ scanned: 1, removed: 1 });
  });

  it("keeps the database row when object deletion fails so the job can retry", async () => {
    const db = {
      venueImageAsset: {
        findMany: vi.fn().mockResolvedValue([{ id: "asset-1", originalStorageKey: "source" }]),
        deleteMany: vi.fn()
      }
    };
    await expect(cleanupExpiredVenueImageAssets({ db, deleteObjects: vi.fn().mockRejectedValue(new Error("r2_down")) })).rejects.toThrow("r2_down");
    expect(db.venueImageAsset.deleteMany).not.toHaveBeenCalled();
  });
});
