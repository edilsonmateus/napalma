import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, "uploads");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOLDER_WHITELIST = new Set(["venues", "artists", "events"]);

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

    if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({
        error: "invalid_file_type",
        message: "Formato invalido. Use JPG, PNG ou WebP."
      });
    }

    const folderRaw = String(req.body?.folder || "general").trim().toLowerCase();
    const folder = FOLDER_WHITELIST.has(folderRaw) ? folderRaw : "general";

    const stamp = Date.now();
    const baseName = safeSlug(req.body?.name || req.file.originalname || "imagem");
    const fileName = `${baseName || "imagem"}-${stamp}${extFromMime(req.file.mimetype)}`;
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
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function ensureUploadsRoot() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}
