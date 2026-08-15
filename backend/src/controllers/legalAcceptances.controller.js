import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { audienceForLegalContext, audienceForUser, getActiveLegalRequirements, getMissingLegalRequirements, legalRequirementError, recordLegalAcceptances } from "../services/legalAcceptance.service.js";

const contexts = ["account_signup", "account_review", "artist_claim", "venue_claim", "advertiser_access", "advertiser_campaign", "patacos_purchase"];
const acceptSchema = z.object({
  context: z.enum(contexts),
  versionIds: z.array(z.string().uuid()).min(1).max(12),
  source: z.string().trim().min(2).max(60).optional()
});

const resolveAudienceForContext = audienceForLegalContext;

function serializeAcceptance(item) {
  return {
    id: item.id,
    action: item.action,
    context: item.context,
    audience: item.audience,
    versionLabel: item.versionLabel,
    contentSha256: item.contentSha256,
    acceptedAt: item.acceptedAt,
    document: item.document ? {
      key: item.document.key,
      title: item.document.title,
      category: item.document.category
    } : null
  };
}

export async function getMyLegalDocuments(req, res, next) {
  try {
    const audience = audienceForUser(req.user);
    const contextsForUser = ["account_review", "artist_claim", "venue_claim", "advertiser_access", "advertiser_campaign", "patacos_purchase"];
    const requirementsByContext = {};
    for (const context of contextsForUser) {
      const effectiveAudience = resolveAudienceForContext(req.user, context);
      requirementsByContext[context] = await getActiveLegalRequirements({ audience: effectiveAudience, context });
    }
    const records = await prisma.legalDocumentAcceptance.findMany({
      where: { userId: req.user.id },
      include: { document: { select: { key: true, title: true, category: true } } },
      orderBy: { acceptedAt: "desc" },
      take: 100
    });
    res.json({ audience, requirementsByContext, acceptances: records.map(serializeAcceptance) });
  } catch (error) {
    next(error);
  }
}

export async function getMyLegalRequirements(req, res, next) {
  try {
    const context = z.enum(contexts).parse(req.query.context || "account_review");
    const audience = resolveAudienceForContext(req.user, context);
    const missing = await getMissingLegalRequirements({ userId: req.user.id, audience, context });
    res.json({ context, audience, items: missing });
  } catch (error) {
    next(error);
  }
}

export async function acceptMyLegalDocuments(req, res, next) {
  try {
    const data = acceptSchema.parse(req.body);
    const audience = resolveAudienceForContext(req.user, data.context);
    try {
      const records = await recordLegalAcceptances({
        req,
        userId: req.user.id,
        audience,
        context: data.context,
        versionIds: data.versionIds,
        source: data.source || "in_app"
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "legal_document.accepted",
          subjectType: "legal_document_acceptance",
          subjectId: records[0]?.id || null,
          metadata: { context: data.context, audience, count: records.length, versionIds: data.versionIds }
        }
      });
      res.status(201).json({ items: records.map((item) => ({ id: item.id, versionId: item.versionId, acceptedAt: item.acceptedAt })) });
    } catch (error) {
      if (error.code === "LEGAL_ACCEPTANCE_REQUIRED") return legalRequirementError(res, error.requirements);
      throw error;
    }
  } catch (error) {
    next(error);
  }
}
