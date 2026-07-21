import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { uploadBufferToR2 } from "../services/r2Storage.service.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { canUseReservedUsername, isReservedUsername, isUsernameSyntaxValid, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy.js";
import { hashPassword } from "../utils/passwordSecurity.js";

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
const reauthenticationSchema = z.object({ currentPassword: z.string().min(1).max(128) });
const userSelect = { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, instagramHandle: true, avatarUrl: true, city: true, neighborhood: true, postalCode: true, role: true, canUseReservedBrandUsername: true };

export async function updateMyProfile(req, res, next) {
  try {
    const data = profileSchema.parse(req.body || {});
    if (data.username !== req.user.username && !isUsernameSyntaxValid(data.username)) {
      return res.status(400).json({ error: "invalid_username", message: "Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou underline." });
    }
    if (data.username !== req.user.username && isReservedUsername(data.username) && !canUseReservedUsername(req.user)) {
      return res.status(409).json({ error: "reserved_username", message: RESERVED_USERNAME_MESSAGE });
    }
    const duplicate = await prisma.user.findFirst({ where: { username: data.username, id: { not: req.user.id } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ error: "username_in_use", message: "Este nome de usuário já está em uso." });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...data, phone: data.phone || null, instagramHandle: data.instagramHandle || null },
      select: userSelect
    });
    await recordAuditEvent({ req, action: "profile.updated", subjectType: "user", subjectId: user.id, metadata: { fields: ["firstName", "lastName", "username", "phone", "instagramHandle"] } });
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
    const passwordHash = await hashPassword(data.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    await recordAuditEvent({ req, action: "profile.password_changed", subjectType: "user", subjectId: req.user.id, metadata: { sessionsRevoked: true } });
    return res.status(204).send();
  } catch (error) { return next(error); }
}

export async function revokeMySessions(req, res, next) {
  try {
    const { currentPassword } = reauthenticationSchema.parse(req.body || {});
    const current = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
    if (!current || !(await bcrypt.compare(currentPassword, current.passwordHash))) {
      return res.status(401).json({ error: "invalid_current_password", message: "A senha atual esta incorreta." });
    }
    const result = await prisma.refreshToken.updateMany({ where: { userId: req.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await recordAuditEvent({ req, action: "profile.sessions_revoked", subjectType: "user", subjectId: req.user.id, metadata: { revokedRefreshTokens: result.count } });
    return res.json({ message: "Sessoes encerradas. Entre novamente para continuar.", revokedSessions: result.count });
  } catch (error) { return next(error); }
}

export async function updateMyLocation(req, res, next) {
  try {
    const data = locationSchema.parse(req.body || {});
    const user = await prisma.user.update({ where: { id: req.user.id }, data, select: userSelect });
    await recordAuditEvent({ req, action: "profile.location_updated", subjectType: "user", subjectId: user.id, metadata: { fields: ["city", "neighborhood", "postalCode"] } });
    return res.json({ item: user });
  } catch (error) { return next(error); }
}

export async function uploadMyAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "file_required", message: "Selecione uma imagem." });
    const sharedUploadsEnabled = isFeatureEnabled("R2_SHARED_UPLOADS_ENABLED");
    if (!sharedUploadsEnabled && process.env.NODE_ENV === "production") {
      return res.status(503).json({
        error: "shared_storage_unavailable",
        message: "O armazenamento permanente de imagens esta indisponivel. Tente novamente mais tarde."
      });
    }
    let buffer;
    try {
      buffer = await sharp(req.file.buffer).rotate().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toBuffer();
    } catch (_error) {
      return res.status(400).json({ error: "invalid_image", message: "Use uma imagem JPG, PNG ou WebP válida." });
    }

    let avatarUrl;
    if (sharedUploadsEnabled) {
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
    await recordAuditEvent({ req, action: "profile.avatar_updated", subjectType: "user", subjectId: user.id, metadata: { storage: sharedUploadsEnabled ? "r2" : "local" } });
    return res.status(201).json({ item: user });
  } catch (error) {
    if (error?.code === "r2_not_configured") {
      return res.status(503).json({ error: "shared_storage_unavailable", message: "O armazenamento permanente de imagens esta indisponivel. Tente novamente mais tarde." });
    }
    return next(error);
  }
}
