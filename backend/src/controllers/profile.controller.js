import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { uploadBufferToR2 } from "../services/r2Storage.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");

export async function uploadMyAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "file_required", message: "Selecione uma imagem." });
    let buffer;
    try {
      buffer = await sharp(req.file.buffer).rotate().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toBuffer();
    } catch (_error) {
      return res.status(400).json({ error: "invalid_image", message: "Use uma imagem JPG, PNG ou WebP válida." });
    }

    let avatarUrl;
    if (isFeatureEnabled("R2_SHARED_UPLOADS_ENABLED")) {
      const uploaded = await uploadBufferToR2({ buffer, mimeType: "image/webp", extension: "webp", keyPrefix: `profiles/${req.user.id}`, metadata: { source: "77gira-user-avatar", userid: req.user.id } });
      avatarUrl = uploaded.url;
    } else {
      const relativeDir = path.join("uploads", "profiles");
      const absoluteDir = path.resolve(PROJECT_ROOT, relativeDir);
      await fs.mkdir(absoluteDir, { recursive: true });
      const fileName = `${req.user.id}-${Date.now()}.webp`;
      await fs.writeFile(path.join(absoluteDir, fileName), buffer);
      avatarUrl = `${req.protocol}://${req.get("host")}/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl }, select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, instagramHandle: true, avatarUrl: true, role: true } });
    return res.status(201).json({ item: user });
  } catch (error) { return next(error); }
}
