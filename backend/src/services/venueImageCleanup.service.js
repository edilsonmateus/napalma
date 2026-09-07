import { prisma } from "../lib/prisma.js";
import { deleteObjectsFromR2 } from "./r2Storage.service.js";

const STORAGE_FIELDS = [
  "originalStorageKey",
  "bannerStorageKey",
  "bannerMediumStorageKey",
  "bannerSmallStorageKey",
  "thumbnailStorageKey",
  "thumbnailSmallStorageKey"
];

export async function cleanupExpiredVenueImageAssets({
  db = prisma,
  deleteObjects = deleteObjectsFromR2,
  now = new Date(),
  batchSize = 100
} = {}) {
  const assets = await db.venueImageAsset.findMany({
    where: {
      status: { in: ["draft", "rejected"] },
      expiresAt: { lte: now }
    },
    orderBy: { expiresAt: "asc" },
    take: Math.max(1, Math.min(Number(batchSize) || 100, 500))
  });

  let removed = 0;
  for (const asset of assets) {
    const keys = STORAGE_FIELDS.map((field) => asset[field]).filter(Boolean);
    await deleteObjects(keys);
    const result = await db.venueImageAsset.deleteMany({
      where: {
        id: asset.id,
        status: { in: ["draft", "rejected"] },
        expiresAt: { lte: now }
      }
    });
    removed += result.count;
  }
  return { scanned: assets.length, removed };
}
