import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { uploadBufferToR2 } from "../services/r2Storage.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const locationSchema = z.object({
  city: z.string().trim().min(2).max(120),
  neighborhood: z.string().trim().min(2).max(120),
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8, "CEP inválido.")
});
const optionalProfileText = (schema) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  schema.nullable().optional()
);
const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40),
  phone: optionalProfileText(z.string().trim().min(8).max(30)),
  instagramHandle: optionalProfileText(z.string().trim().min(2).max(80))
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "A nova senha deve ser diferente da senha atual.",
  path: ["newPassword"]
});
const userSelect = { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, instagramHandle: true, avatarUrl: true, city: true, neighborhood: true, postalCode: true, role: true };

export async function updateMyProfile(req, res, next) {
  try {
    const data = profileSchema.parse(req.body || {});
    const duplicate = await prisma.user.findFirst({ where: { username: data.username, id: { not: req.user.id } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ error: "username_in_use", message: "Este nome de usuário já está em uso." });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...data, phone: data.phone || null, instagramHandle: data.instagramHandle || null },
      select: userSelect
    });
    return res.json({ item: user });
  } catch (error) { return next(error); }
}

export async function updateMyPassword(req, res, next) {
  try {
    const data = passwordSchema.parse(req.body || {});
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
    if (!current || !(await bcrypt.compare(data.currentPassword, current.passwordHash))) {
      return res.status(401).json({ error: "invalid_current_password", message: "A senha atual está incorreta." });
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    return res.status(204).send();
  } catch (error) { return next(error); }
}

export async function updateMyLocation(req, res, next) {
  try {
    const data = locationSchema.parse(req.body || {});
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: userSelect });
    return res.json({ item: user });
  } catch (error) { return next(error); }
}

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

    const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl }, select: userSelect });
    return res.status(201).json({ item: user });
  } catch (error) { return next(error); }
}
