import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";

function requestIp(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return req.ip || forwarded || req.socket?.remoteAddress || null;
}

function fingerprint(value) {
  if (!value) return null;
  const salt = process.env.AUDIT_LOG_SALT || process.env.JWT_SECRET || "77gira-audit-development";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

/** Records only whitelisted, minimised metadata. Never pass passwords, tokens,
 * documents, free-form claim evidence or raw IP addresses to this helper. */
export async function recordAuditEvent({ req, actorUserId = null, action, subjectType, subjectId = null, metadata = null }) {
  return prisma.auditLog.create({
    data: {
      actorUserId: actorUserId || req?.user?.id || null,
      action,
      subjectType,
      subjectId,
      metadata,
      ipHash: req ? fingerprint(requestIp(req)) : null
    }
  });
}
