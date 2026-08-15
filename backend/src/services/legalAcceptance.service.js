import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const CONTEXT_CATEGORIES = {
  account_signup: ["terms_of_use", "privacy_cookies"],
  account_review: ["terms_of_use", "privacy_cookies"],
  artist_claim: ["claim_management"],
  venue_claim: ["claim_management"],
  advertiser_access: ["advertising_terms"],
  advertiser_campaign: ["advertising_terms"],
  patacos_purchase: ["patacos_policy"]
};

export function hashIp(value) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex");
}

export function audienceForUser(user, fallback = "user") {
  if (user?.role === "venue_manager") return "venue_manager";
  if (user?.role === "producer") return "producer";
  return fallback;
}

// Resolved only on the server so a browser cannot choose a more permissive
// audience for a legal acceptance.
export function audienceForLegalContext(user, context) {
  if (context === "artist_claim") return "artist_manager";
  if (["advertiser_access", "advertiser_campaign", "patacos_purchase"].includes(context)) {
    return "advertiser";
  }
  return audienceForUser(user);
}

export async function getActiveLegalRequirements({ audience, context }) {
  const categories = CONTEXT_CATEGORIES[context] || [];
  if (!categories.length) return [];
  const now = new Date();
  const versions = await prisma.legalDocumentVersion.findMany({
    where: {
      status: "active",
      document: { category: { in: categories } },
      audiences: { some: { audience } },
      OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }]
    },
    include: {
      document: { select: { id: true, key: true, title: true, category: true, summary: true, isPublic: true } },
      audiences: { select: { audience: true } }
    },
    orderBy: { publishedAt: "desc" }
  });
  return versions.map((version) => ({
    id: version.id,
    documentId: version.documentId,
    documentKey: version.document.key,
    title: version.document.title,
    category: version.document.category,
    summary: version.document.summary,
    versionLabel: version.versionLabel,
    contentText: version.contentText,
    contentSha256: version.contentSha256,
    effectiveAt: version.effectiveAt,
    publishedAt: version.publishedAt,
    requiresReacceptance: version.requiresReacceptance,
    audiences: version.audiences.map((item) => item.audience)
  }));
}

export async function getMissingLegalRequirements({ userId, audience, context }) {
  const requirements = await getActiveLegalRequirements({ audience, context });
  if (!requirements.length) return [];
  const accepted = await prisma.legalDocumentAcceptance.findMany({
    where: { userId, context, action: "accepted", versionId: { in: requirements.map((item) => item.id) } },
    select: { versionId: true }
  });
  const acceptedIds = new Set(accepted.map((item) => item.versionId));
  return requirements.filter((item) => !acceptedIds.has(item.id));
}

export async function recordLegalAcceptances({ req, userId, audience, context, versionIds, source = "in_app" }) {
  const requirements = await getActiveLegalRequirements({ audience, context });
  const expectedIds = new Set(requirements.map((item) => item.id));
  const selectedIds = [...new Set(versionIds || [])];
  if (selectedIds.length !== expectedIds.size || selectedIds.some((id) => !expectedIds.has(id))) {
    const error = new Error("Aceite incompleto ou documento desatualizado.");
    error.code = "LEGAL_ACCEPTANCE_REQUIRED";
    error.requirements = requirements;
    throw error;
  }
  if (!requirements.length) return [];
  const byId = new Map(requirements.map((item) => [item.id, item]));
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
  const records = await prisma.$transaction(requirements.map((item) => prisma.legalDocumentAcceptance.create({
    data: {
      userId,
      documentId: item.documentId,
      versionId: item.id,
      audience,
      context,
      action: "accepted",
      versionLabel: item.versionLabel,
      contentSha256: item.contentSha256,
      source,
      userAgent: String(req.get?.("user-agent") || "").slice(0, 512) || null,
      ipHash: hashIp(ip),
      metadata: { documentKey: byId.get(item.id)?.documentKey }
    }
  })));
  return records;
}

export function legalRequirementError(res, requirements, metadata = {}) {
  return res.status(428).json({
    error: "legal_acceptance_required",
    message: "Antes de continuar, leia e aceite os documentos aplicáveis a esta ação.",
    requirements,
    ...metadata
  });
}
