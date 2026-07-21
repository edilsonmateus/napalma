import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { uploadBufferToR2 } from "../services/r2Storage.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, "uploads");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOLDER_WHITELIST = new Set([
  "venues",
  "artists",
  "events",
  "covers",
  "profiles",
  "banners",
  "general"
]);

function safeSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extFromMime(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "file_required",
        message: "Selecione uma imagem para upload."
      });
    }

    let imageMetadata;
    try {
      imageMetadata = await sharp(req.file.buffer).metadata();
    } catch (_error) {
      return res.status(400).json({ error: "invalid_image", message: "Arquivo de imagem invalido." });
    }
    const detectedMimeType = imageMetadata.format === "png"
      ? "image/png"
      : imageMetadata.format === "webp"
        ? "image/webp"
        : imageMetadata.format === "jpeg"
          ? "image/jpeg"
          : "";
    if (!ALLOWED_MIME_TYPES.has(detectedMimeType)) {
      return res.status(400).json({
        error: "invalid_file_type",
        message: "Formato invalido. Use JPG, PNG ou WebP."
      });
    }

    const folderRaw = String(req.body?.folder || "general").trim().toLowerCase();
    const folder = FOLDER_WHITELIST.has(folderRaw) ? folderRaw : "general";

    const sharedUploadsEnabled = isFeatureEnabled("R2_SHARED_UPLOADS_ENABLED");
    if (!sharedUploadsEnabled && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        error: "shared_storage_unavailable",
        message: "O armazenamento permanente de imagens esta indisponivel. Tente novamente mais tarde."
      });
    }

    if (sharedUploadsEnabled) {
      const uploaded = await uploadBufferToR2({
        buffer: req.file.buffer,
        mimeType: detectedMimeType,
        extension: extFromMime(detectedMimeType).slice(1),
        keyPrefix: folder,
        metadata: { source: "77gira-shared-upload" }
      });
      return res.status(201).json({
        item: {
          ...uploaded,
          path: uploaded.storageKey,
          size: uploaded.fileSizeBytes,
          width: imageMetadata.width,
          height: imageMetadata.height
        }
      });
    }

    const stamp = Date.now();
    const baseName = safeSlug(req.body?.name || req.file.originalname || "imagem");
    const fileName = `${baseName || "imagem"}-${stamp}${extFromMime(detectedMimeType)}`;
    const relativeDir = path.join("uploads", folder);
    const absoluteDir = path.resolve(PROJECT_ROOT, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const absolutePath = path.resolve(absoluteDir, fileName);
    await fs.writeFile(absolutePath, req.file.buffer);

    const urlPath = `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
    const publicBase = `${req.protocol}://${req.get("host")}`;

    res.status(201).json({
      item: {
        url: `${publicBase}${urlPath}`,
        path: urlPath,
        mimeType: detectedMimeType,
        size: req.file.size
      }
    });
  } catch (error) {
    if (error?.code === "r2_not_configured") {
      return res.status(503).json({ error: "shared_storage_unavailable", message: "O armazenamento permanente de imagens esta indisponivel. Tente novamente mais tarde." });
    }
    next(error);
  }
}

export async function ensureUploadsRoot() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}
