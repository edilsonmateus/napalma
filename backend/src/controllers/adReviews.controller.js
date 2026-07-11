import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../services/audit.service.js";

const paramsSchema = z.object({ entityType: z.enum(["campaign", "creative"]), id: z.string().uuid() });
const decisionSchema = z.object({ reason: z.string().trim().min(3).max(2000).optional() });

function repository(client, entityType) {
  return entityType === "campaign" ? client.adCampaign : client.adCreative;
}

async function transition(req, res, next, { action, expected, toStatus, requireReason = false }) {
  try {
    const { entityType, id } = paramsSchema.parse(req.params);
    const { reason } = decisionSchema.parse(req.body || {});
    if (requireReason && !reason) return res.status(400).json({ error: "review_reason_required", message: "Informe o motivo da rejeicao." });
    const item = await prisma.$transaction(async (tx) => {
      const repo = repository(tx, entityType);
      const current = await repo.findUnique({ where: { id } });
      if (!current) return null;
      const currentStatus = current.reviewStatus || "draft";
      if (!expected.includes(currentStatus)) return { conflict: currentStatus };
      const now = new Date();
      const data = {
        reviewStatus: toStatus,
        reviewNotes: reason || null,
        submittedAt: action === "submit" ? now : current.submittedAt,
        approvedAt: action === "approve" ? now : null,
        rejectedAt: action === "reject" ? now : null,
        reviewedByUserId: action === "submit" ? null : req.user.id,
        requiresReviewAfterEdit: false
      };
      const updated = await repo.update({ where: { id }, data });
      await tx.adReviewLog.create({ data: { entityType, entityId: id, action, fromStatus: current.reviewStatus, toStatus, actorUserId: req.user.id, reason: reason || null } });
      return updated;
    });
    if (!item) return res.status(404).json({ error: "not_found", message: "Item nao encontrado." });
    if (item.conflict) return res.status(409).json({ error: "invalid_review_transition", reviewStatus: item.conflict });
    await recordAuditEvent({ req, action: `ads.review.${action}`, subjectType: `ad_${entityType}`, subjectId: id, metadata: { toStatus } });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export const submitAdReview = (req, res, next) => transition(req, res, next, { action: "submit", expected: ["draft", "rejected", "changes_requested"], toStatus: "pending_review" });
export const approveAdReview = (req, res, next) => transition(req, res, next, { action: "approve", expected: ["pending_review"], toStatus: "approved" });
export const rejectAdReview = (req, res, next) => transition(req, res, next, { action: "reject", expected: ["pending_review"], toStatus: "rejected", requireReason: true });

export async function getAdReviewHistory(req, res, next) {
  try {
    const { entityType, id } = paramsSchema.parse(req.params);
    const items = await prisma.adReviewLog.findMany({ where: { entityType, entityId: id }, orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } } });
    res.json({ items });
  } catch (error) { next(error); }
}

export async function listAdReviewQueue(_req, res, next) {
  try {
    const [campaigns, creatives] = await Promise.all([
      prisma.adCampaign.findMany({ where: { reviewStatus: "pending_review" }, orderBy: { submittedAt: "asc" } }),
      prisma.adCreative.findMany({ where: { reviewStatus: "pending_review" }, include: { campaign: { select: { id: true, name: true, advertiser: true } } }, orderBy: { submittedAt: "asc" } })
    ]);
    res.json({ campaigns, creatives });
  } catch (error) { next(error); }
}
