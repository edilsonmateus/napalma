import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export async function attachUser(req, _res, next) {
  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  req.user = null;
  req.userRole = "attendee";

  if (!token) return next();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    // An invalid or expired access token is not a server failure. Protected
    // routes will answer 401 and the client can use its refresh token.
    return next();
  }

  if (!payload?.sub) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        city: true,
        neighborhood: true,
        postalCode: true,
        role: true,
        canUseReservedBrandUsername: true,
        operationAccessGrants: {
          where: { revokedAt: null },
          select: { scope: true }
        }
      }
    });

    if (!user) return next();

    req.user = {
      ...user,
      operationScopes: user.operationAccessGrants.map((grant) => grant.scope)
    };
    req.userRole = user.role;
    return next();
  } catch (cause) {
    // Do not disguise a database/network failure as an unauthenticated user.
    // A false 401 would make the frontend erase a valid local session.
    const error = new Error("Nao foi possivel validar a sessao agora.");
    error.code = "auth_context_unavailable";
    error.statusCode = 503;
    error.cause = cause;
    return next(error);
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
