import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import crypto from "node:crypto";
import { linkVisitorToUser } from "./audience.controller.js";
import { linkPushSubscriptionsToUser } from "../services/push.service.js";
import { isReservedUsername, isUsernameSyntaxValid, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy.js";
import { hashPassword, needsPasswordRehash } from "../utils/passwordSecurity.js";
import { sendPasswordResetEmail } from "../services/transactionalEmail.service.js";

const postalCodeSchema = z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8, "CEP inválido.");

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: z.string().trim().min(8).optional(),
  instagramHandle: z.string().trim().min(2).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  neighborhood: z.string().trim().min(2).max(120).optional(),
  postalCode: postalCodeSchema.optional(),
  visitorId: z.string().min(8).max(120).optional(),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  visitorId: z.string().min(8).max(120).optional()
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254)
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: z.string().min(8).max(128),
  passwordConfirmation: z.string().min(8).max(128)
}).refine((data) => data.password === data.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "As senhas precisam ser iguais."
});

const FORGOT_PASSWORD_MESSAGE = "Se houver uma conta com este email, enviaremos as instruções para redefinir a senha.";
const RESET_RESEND_COOLDOWN_MS = 60_000;

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    expiresIn: "15m"
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });
  return raw;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    instagramHandle: user.instagramHandle ?? "",
    avatarUrl: user.avatarUrl ?? "",
    city: user.city ?? "",
    neighborhood: user.neighborhood ?? "",
    postalCode: user.postalCode ?? "",
    role: user.role,
    canUseReservedBrandUsername: Boolean(user.canUseReservedBrandUsername),
    operationScopes: (user.operationAccessGrants || []).filter((grant) => !grant.revokedAt).map((grant) => grant.scope)
  };
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    if (!isUsernameSyntaxValid(data.username)) {
      return res.status(400).json({ error: "invalid_username", message: "Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou underline." });
    }
    if (isReservedUsername(data.username)) {
      return res.status(409).json({ error: "reserved_username", message: RESERVED_USERNAME_MESSAGE });
    }
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: data.username }]
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({
        error: "user_already_exists",
        message: "Ja existe usuario com esse email ou username."
      });
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        instagramHandle: data.instagramHandle,
        city: data.city,
        neighborhood: data.neighborhood,
        postalCode: data.postalCode,
        passwordHash,
        role: "attendee"
      }
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    await Promise.all([
      linkVisitorToUser(data.visitorId, user.id),
      linkPushSubscriptionsToUser(data.visitorId, user.id)
    ]);
    res.status(201).json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { operationAccessGrants: true } });

    if (!user) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Email ou senha invalidos."
      });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "Email ou senha invalidos."
      });
    }

    if (needsPasswordRehash(user.passwordHash)) {
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.password) } });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    await Promise.all([
      linkVisitorToUser(data.visitorId, user.id),
      linkPushSubscriptionsToUser(data.visitorId, user.id)
    ]);
    res.json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function devLoginAdmin(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({
      error: "not_found",
      message: "Rota nao encontrada."
    });
  }

  try {
    const email = "admin@napalma.app";
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      user = await prisma.user.update({
        where: { email },
        data: { role: "admin", canUseReservedBrandUsername: true }
      });
    } else {
      const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
      user = await prisma.user.create({
        data: {
          email,
          username: `admin.local.${crypto.randomBytes(4).toString("hex")}`,
          firstName: "Admin",
          lastName: "Local",
          passwordHash,
          role: "admin",
          canUseReservedBrandUsername: true
        }
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    return res.json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
}

export function me(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Autenticacao obrigatoria."
    });
  }
  return res.json({ user: req.user });
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { operationAccessGrants: true } } }
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({
        error: "invalid_refresh_token",
        message: "Refresh token invalido ou expirado."
      });
    }

    const accessToken = signAccessToken(stored.user);
    const nextRefreshToken = await issueRefreshToken(stored.userId);
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    res.json({
      accessToken,
      refreshToken: nextRefreshToken,
      user: sanitizeUser(stored.user)
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash }
    });

    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email: rawEmail } = forgotPasswordSchema.parse(req.body);
    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true }
    });

    if (!user) {
      return res.status(202).json({ message: FORGOT_PASSWORD_MESSAGE });
    }

    const latest = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_RESEND_COOLDOWN_MS) {
      return res.status(202).json({ message: FORGOT_PASSWORD_MESSAGE });
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60_000);
    const resetUrl = `${env.passwordResetUrl}?token=${encodeURIComponent(rawToken)}`;

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt }
      })
    ]);

    try {
      await sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetUrl,
        expiresInMinutes: env.passwordResetTokenTtlMinutes
      });
    } catch (emailError) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      console.error("Falha segura no envio de recuperação de senha:", emailError?.message || "email_provider_failure");
    }

    return res.status(202).json({ message: FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(data.token);
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true }
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      return res.status(400).json({
        error: "invalid_or_expired_reset_token",
        message: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha."
      });
    }

    const passwordHash = await hashPassword(data.password);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now }
      });
      if (claimed.count !== 1) return false;

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash }
      });
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now }
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: now }
      });
      return true;
    });

    if (!result) {
      return res.status(400).json({
        error: "invalid_or_expired_reset_token",
        message: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha."
      });
    }

    return res.json({ message: "Senha redefinida com sucesso. Entre novamente para continuar." });
  } catch (error) {
    return next(error);
  }
}
