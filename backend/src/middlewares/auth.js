import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export async function attachUser(req, _res, next) {
  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  req.user = null;
  req.userRole = "attendee";

  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload?.sub) return next();

    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true
      }
    });

    if (!user) return next();

    req.user = user;
    req.userRole = user.role;
    return next();
  } catch (_error) {
    return next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Autenticacao obrigatoria."
    });
  }
  return next();
}
