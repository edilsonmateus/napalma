import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageVenue } from "../lib/access.control.js";
import { deleteObjectsFromR2, uploadBufferToR2 } from "../services/r2Storage.service.js";
import {
  normalizeVenueImageCrop,
  processVenueImage
} from "../services/venueImageProcessing.service.js";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function logVenueImageMetric(event, metadata = {}) {
  console.info(JSON.stringify({ event, ...metadata }));
}

function jsonField(value, fallback = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch (_error) {
    return fallback;
  }
}

const inputSchema = z.object({
  venueId: z.preprocess((value) => value || undefined, z.string().uuid().optional()),
  bannerMode: z.enum(["cover", "contain_blur"]).default("cover"),
  bannerCrop: z.preprocess((value) => jsonField(value), z.object({
    x: z.coerce.number().min(0).max(1).optional(),
    y: z.coerce.number().min(0).max(1).optional(),
    zoom: z.coerce.number().min(1).max(3).optional()
  }).default({})),
  thumbnailCrop: z.preprocess((value) => jsonField(value), z.object({
    x: z.coerce.number().min(0).max(1).optional(),
    y: z.coerce.number().min(0).max(1).optional(),
    zoom: z.coerce.number().min(1).max(3).optional()
  }).default({}))
});

function publicAsset(asset) {
  return {
    id: asset.id,
    status: asset.status,
    bannerMode: asset.bannerMode,
    bannerUrl: asset.bannerUrl,
    bannerMediumUrl: asset.bannerMediumUrl,
    bannerSmallUrl: asset.bannerSmallUrl,
    thumbnailUrl: asset.thumbnailUrl,
    thumbnailSmallUrl: asset.thumbnailSmallUrl,
    sourceWidth: asset.sourceWidth,
    sourceHeight: asset.sourceHeight,
    sourceMimeType: asset.sourceMimeType,
    sourceSizeBytes: asset.sourceSizeBytes,
    expiresAt: asset.expiresAt
  };
}

async function assertVenueImageAccess(user, venueId) {
  if (!venueId) {
    if (user?.role === "admin") return null;
    throw Object.assign(new Error("venue_required"), { status: 400 });
  }
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      producerAccesses: { select: { producerId: true } },
      managerAccesses: { select: { userId: true } }
    }
  });
  if (!venue) throw Object.assign(new Error("venue_not_found"), { status: 404 });
  if (!canManageVenue(user, venue)) throw Object.assign(new Error("forbidden"), { status: 403 });
  return venue;
}

export async function createVenueImageAsset(req, res, next) {
  let uploadedStorageKeys = [];
  let assetCreated = false;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file_required", message: "Selecione uma imagem para a casa." });
    }
    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({ error: "file_too_large", message: "A imagem deve ter no máximo 5 MB." });
    }

    const input = inputSchema.parse(req.body || {});
    await assertVenueImageAccess(req.user, input.venueId);

    const bannerCrop = normalizeVenueImageCrop(input.bannerCrop);
    const thumbnailCrop = normalizeVenueImageCrop(input.thumbnailCrop);
    const processed = await processVenueImage({
      buffer: req.file.buffer,
      bannerMode: input.bannerMode,
      bannerCrop,
      thumbnailCrop
    });

    const assetId = crypto.randomUUID();
    const keyPrefix = `venues/image-assets/${assetId}`;
    const metadata = { source: "77gira-venue-image", assetid: assetId };
    const upload = (variant, label) => uploadBufferToR2({
      buffer: variant.buffer,
      mimeType: "image/webp",
      extension: "webp",
      keyPrefix: `${keyPrefix}/${label}`,
      metadata: { ...metadata, variant: label }
    });

    const uploadResults = await Promise.allSettled([
      upload(processed.source, "source"),
      upload(processed.banner, "banner"),
      upload(processed.bannerMedium, "banner-medium"),
      upload(processed.bannerSmall, "banner-small"),
      upload(processed.thumbnail, "thumbnail"),
      upload(processed.thumbnailSmall, "thumbnail-small")
    ]);
    uploadedStorageKeys = uploadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value.storageKey)
      .filter(Boolean);
    const failedUpload = uploadResults.find((result) => result.status === "rejected");
    if (failedUpload) {
      if (uploadedStorageKeys.length) {
        await deleteObjectsFromR2(uploadedStorageKeys).catch(() => undefined);
        uploadedStorageKeys = [];
      }
      throw failedUpload.reason;
    }
    const [original, banner, bannerMedium, bannerSmall, thumbnail, thumbnailSmall] = uploadResults.map((result) => result.value);

    const asset = await prisma.venueImageAsset.create({
      data: {
        id: assetId,
        ownerUserId: req.user.id,
        venueId: input.venueId || null,
        status: "draft",
        bannerMode: input.bannerMode,
        originalUrl: original.url,
        originalStorageKey: original.storageKey,
        bannerUrl: banner.url,
        bannerStorageKey: banner.storageKey,
        bannerMediumUrl: bannerMedium.url,
        bannerMediumStorageKey: bannerMedium.storageKey,
        bannerSmallUrl: bannerSmall.url,
        bannerSmallStorageKey: bannerSmall.storageKey,
        thumbnailUrl: thumbnail.url,
        thumbnailStorageKey: thumbnail.storageKey,
        thumbnailSmallUrl: thumbnailSmall.url,
        thumbnailSmallStorageKey: thumbnailSmall.storageKey,
        sourceMimeType: processed.source.originalMimeType,
        sourceWidth: processed.source.width,
        sourceHeight: processed.source.height,
        sourceSizeBytes: processed.source.originalSizeBytes,
        checksum: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
        bannerCrop,
        thumbnailCrop,
        expiresAt: new Date(Date.now() + DRAFT_TTL_MS)
      }
    });
    assetCreated = true;

    logVenueImageMetric("venue_image_processed", {
      bannerMode: input.bannerMode,
      lowResolution: processed.source.width < 1200 || processed.source.height < 675
    });

    return res.status(201).json({ item: publicAsset(asset) });
  } catch (error) {
    if (!assetCreated && uploadedStorageKeys.length) {
      await deleteObjectsFromR2(uploadedStorageKeys).catch(() => undefined);
    }
    if (error?.message === "venue_required") {
      return res.status(400).json({ error: "venue_required", message: "Informe a casa que receberá esta imagem." });
    }
    if (error?.message === "venue_not_found") {
      return res.status(404).json({ error: "venue_not_found", message: "Casa não encontrada." });
    }
    if (error?.message === "forbidden") {
      return res.status(403).json({ error: "forbidden", message: "Você não pode enviar imagens para esta casa." });
    }
    if (error?.code === "invalid_image" || error?.code === "invalid_file_type") {
      logVenueImageMetric("venue_image_rejected", { code: error.code });
      return res.status(error.status || 400).json({ error: error.code, message: error.message });
    }
    if (error?.code === "r2_not_configured") {
      logVenueImageMetric("venue_image_storage_failed", { code: error.code });
      return res.status(503).json({ error: "shared_storage_unavailable", message: "O armazenamento de imagens está indisponível." });
    }
    return next(error);
  }
}
