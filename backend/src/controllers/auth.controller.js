import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import crypto from "node:crypto";

const roleSchema = z.enum(["admin", "producer", "venue_manager", "attendee"]);

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  password: z.string().min(6),
  role: roleSchema.optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

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
    role: user.role
  };
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
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

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        role: data.role || "attendee"
      }
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.status(201).json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

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

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
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
      include: { user: true }
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
