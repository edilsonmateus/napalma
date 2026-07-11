import { AdSlot, AdvertiserAccountType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const uuid = z.string().uuid();
const accountParams = z.object({ accountId: uuid });
const campaignParams = z.object({ campaignId: uuid });
const creativeParams = z.object({ creativeId: uuid });
const campaignPayload = z.object({
  advertiser: z.string().trim().min(2).max(160),
  name: z.string().trim().min(2).max(160),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  runInAllSlots: z.boolean().default(false),
  targeting: z.record(z.any()).optional().nullable()
});
const creativePayload = z.object({
  slot: z.nativeEnum(AdSlot),
  title: z.string().trim().max(160).optional().nullable(),
  imageUrl: z.string().url(),
  destinationUrl: z.string().url().optional().nullable(),
  altText: z.string().trim().max(300).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  storageProvider: z.string().max(40).optional().nullable(),
  storageKey: z.string().max(500).optional().nullable(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().nullable(),
  fileSizeBytes: z.number().int().positive().max(5 * 1024 * 1024).optional().nullable(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/).optional().nullable(),
  assetVersion: z.number().int().positive().optional()
});
const accessRequestPayload = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.nativeEnum(AdvertiserAccountType).default("brand"),
  legalName: z.string().trim().max(200).optional().nullable(),
  contactEmail: z.string().trim().email().max(200).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  objective: z.enum(["brand_campaign", "boost_event", "boost_venue", "agency", "other"]).default("brand_campaign"),
  message: z.string().trim().min(10).max(1200)
});

const WRITE_ROLES = ["owner", "admin", "campaign_manager"];

async function membership(userId, accountId) {
  return prisma.advertiserMembership.findFirst({
    where: { userId, accountId, status: "active", account: { status: { notIn: ["suspended", "rejected", "archived"] } } },
    include: { account: true }
  });
}

function deny(res, write = false) {
  return res.status(403).json({ error: "advertiser_access_denied", message: write ? "Seu papel nao permite alterar campanhas." : "Sem acesso a esta conta anunciante." });
}

function dates(payload) {
  return {
    ...payload,
    startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null
  };
}

export async function listMyAdvertiserAccounts(req, res, next) {
  try {
    const items = await prisma.advertiserMembership.findMany({
      where: { userId: req.user.id, status: "active", account: { status: { notIn: ["rejected", "archived"] } } },
      include: { account: { include: { _count: { select: { campaigns: true } } } } },
      orderBy: { createdAt: "asc" }
    });
    res.json({ items: items.map((item) => ({ ...item.account, membership: { id: item.id, role: item.role, status: item.status } })) });
  } catch (error) { next(error); }
}

export async function listMyAdvertiserAccessRequests(req, res, next) {
  try {
    const items = await prisma.advertiserMembership.findMany({
      where: {
        userId: req.user.id,
        status: { in: ["invited", "suspended"] },
        account: { source: "self_service_request", status: { in: ["draft", "pending_review", "suspended"] } }
      },
      include: { account: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({
      items: items.map((item) => ({
        id: item.account.id,
        name: item.account.name,
        type: item.account.type,
        status: item.account.status,
        source: item.account.source,
        createdAt: item.account.createdAt,
        membership: { id: item.id, role: item.role, status: item.status }
      }))
    });
  } catch (error) { return next(error); }
}

export async function requestMyAdvertiserAccess(req, res, next) {
  try {
    const payload = accessRequestPayload.parse(req.body);
    const existing = await prisma.advertiserMembership.findFirst({
      where: {
        userId: req.user.id,
        status: { not: "revoked" },
        account: {
          name: { equals: payload.name, mode: "insensitive" },
          status: { notIn: ["rejected", "archived"] }
        }
      },
      include: { account: true }
    });
    if (existing) {
      return res.status(409).json({
        error: "advertiser_request_exists",
        message: "Ja existe uma conta ou solicitacao para este anunciante."
      });
    }

    const notes = [
      "Solicitacao enviada pela Central do Anunciante.",
      `Objetivo: ${payload.objective}.`,
      `Mensagem: ${payload.message}`
    ].join("\n");
    const item = await prisma.$transaction(async (tx) => {
      const account = await tx.advertiserAccount.create({
        data: {
          name: payload.name,
          type: payload.type,
          status: "pending_review",
          source: "self_service_request",
          legalName: payload.legalName || null,
          contactEmail: payload.contactEmail || req.user.email || null,
          contactPhone: payload.contactPhone || null,
          notes,
          createdByUserId: req.user.id
        }
      });
      const membership = await tx.advertiserMembership.create({
        data: {
          accountId: account.id,
          userId: req.user.id,
          role: "owner",
          status: "invited",
          invitedByUserId: req.user.id
        }
      });
      return { ...account, membership: { id: membership.id, role: membership.role, status: membership.status } };
    });
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function listMyAdvertiserCampaigns(req, res, next) {
  try {
    const { accountId } = accountParams.parse(req.params);
    const access = await membership(req.user.id, accountId);
    if (!access) return deny(res);
    const [items, impressions, clicks] = await Promise.all([
      prisma.adCampaign.findMany({ where: { advertiserAccountId: accountId }, include: { creatives: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" } }),
      prisma.adEventLog.groupBy({ by: ["campaignId"], where: { type: "impression", campaign: { advertiserAccountId: accountId } }, _count: { _all: true } }),
      prisma.adEventLog.groupBy({ by: ["campaignId"], where: { type: "click", campaign: { advertiserAccountId: accountId } }, _count: { _all: true } })
    ]);
    const impressionsByCampaign = new Map(impressions.map((item) => [item.campaignId, item._count._all]));
    const clicksByCampaign = new Map(clicks.map((item) => [item.campaignId, item._count._all]));
    const enriched = items.map((item) => {
      const totalImpressions = impressionsByCampaign.get(item.id) || 0;
      const totalClicks = clicksByCampaign.get(item.id) || 0;
      return {
        ...item,
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: totalImpressions ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
          spentPatacos: item.spentCredits,
          remainingPatacos: Math.max(0, item.budgetCredits - item.spentCredits)
        }
      };
    });
    return res.json({ account: access.account, membership: { role: access.role }, items: enriched });
  } catch (error) { return next(error); }
}

export async function createMyAdvertiserCampaign(req, res, next) {
  try {
    const { accountId } = accountParams.parse(req.params);
    const access = await membership(req.user.id, accountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    const payload = dates(campaignPayload.parse(req.body));
    const item = await prisma.adCampaign.create({ data: { ...payload, advertiserAccountId: accountId, createdByUserId: req.user.id, status: "draft", isEnabled: false, reviewStatus: "draft" }, include: { creatives: true } });
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function updateMyAdvertiserCampaign(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const current = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!current?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, current.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    if (current.reviewStatus === "pending_review") return res.status(409).json({ error: "campaign_under_review", message: "A campanha esta em revisao." });
    const payload = dates(campaignPayload.partial().parse(req.body));
    const item = await prisma.adCampaign.update({ where: { id: campaignId }, data: { ...payload, status: "draft", isEnabled: false, reviewStatus: "draft", approvedAt: null, reviewedByUserId: null, requiresReviewAfterEdit: current.reviewStatus === "approved" }, include: { creatives: true } });
    if (current.reviewStatus === "approved") await prisma.adReviewLog.create({ data: { entityType: "campaign", entityId: campaignId, action: "reopen_after_edit", fromStatus: "approved", toStatus: "draft", actorUserId: req.user.id } });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export async function deleteMyAdvertiserCampaign(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const current = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { creatives: { select: { id: true } } } });
    if (!current?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, current.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    const reviewStatus = current.reviewStatus || "draft";
    const canDelete = current.status === "draft" && ["draft", "pending_review", "rejected", "changes_requested"].includes(reviewStatus);
    if (!canDelete) {
      return res.status(409).json({
        error: "campaign_must_be_ended",
        message: "Campanhas aprovadas ou em veiculacao preservam historico. Use encerrar em vez de excluir."
      });
    }
    await prisma.$transaction(async (tx) => {
      await tx.adCreative.deleteMany({ where: { campaignId } });
      await tx.adCampaign.delete({ where: { id: campaignId } });
    });
    return res.status(204).send();
  } catch (error) { return next(error); }
}

export async function endMyAdvertiserCampaign(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const current = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!current?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, current.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    const item = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: "ended", isEnabled: false, endsAt: current.endsAt || new Date() },
      include: { creatives: true }
    });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export async function duplicateMyAdvertiserCampaign(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const current = await prisma.adCampaign.findUnique({ where: { id: campaignId }, include: { creatives: true } });
    if (!current?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, current.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    const item = await prisma.adCampaign.create({
      data: {
        advertiser: current.advertiser,
        name: `${current.name} — cópia`,
        status: "draft",
        startsAt: current.startsAt,
        endsAt: current.endsAt,
        priority: current.priority,
        frequencyCapDaily: current.frequencyCapDaily,
        runInAllSlots: current.runInAllSlots,
        isEnabled: false,
        targeting: current.targeting || undefined,
        createdByUserId: req.user.id,
        advertiserAccountId: current.advertiserAccountId,
        reviewStatus: "draft",
        requiresReviewAfterEdit: false,
        creatives: {
          create: current.creatives.map((creative) => ({
            slot: creative.slot,
            title: creative.title,
            imageUrl: creative.imageUrl,
            destinationUrl: creative.destinationUrl,
            altText: creative.altText,
            width: creative.width,
            height: creative.height,
            isEnabled: false,
            storageProvider: creative.storageProvider,
            storageKey: creative.storageKey,
            mimeType: creative.mimeType,
            fileSizeBytes: creative.fileSizeBytes,
            checksum: creative.checksum,
            assetVersion: creative.assetVersion,
            reviewStatus: "draft"
          }))
        }
      },
      include: { creatives: true }
    });
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function setMyAdvertiserCampaignLifecycle(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const { status } = z.object({ status: z.enum(["active", "paused"]) }).parse(req.body);
    const current = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!current?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, current.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    if (!["active", "paused"].includes(current.status)) return res.status(409).json({ error: "invalid_campaign_lifecycle", message: "A campanha precisa estar ativada para ser pausada ou retomada." });
    if (status === "active" && (current.reviewStatus !== "approved" || current.budgetCredits <= current.spentCredits)) {
      return res.status(409).json({ error: "campaign_not_ready", message: "A campanha precisa de revisão aprovada e patacos disponíveis para entrar no ar." });
    }
    const item = await prisma.adCampaign.update({ where: { id: campaignId }, data: { status, isEnabled: status === "active" }, include: { creatives: true } });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export async function createMyAdvertiserCreative(req, res, next) {
  try {
    const { campaignId } = campaignParams.parse(req.params);
    const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign?.advertiserAccountId) return res.status(404).json({ error: "campaign_not_found" });
    const access = await membership(req.user.id, campaign.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    const item = await prisma.adCreative.create({ data: { campaignId, ...creativePayload.parse(req.body), isEnabled: false, reviewStatus: "draft" } });
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function updateMyAdvertiserCreative(req, res, next) {
  try {
    const { creativeId } = creativeParams.parse(req.params);
    const current = await prisma.adCreative.findUnique({ where: { id: creativeId }, include: { campaign: true } });
    if (!current?.campaign?.advertiserAccountId) return res.status(404).json({ error: "creative_not_found" });
    const access = await membership(req.user.id, current.campaign.advertiserAccountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    if (current.reviewStatus === "pending_review") return res.status(409).json({ error: "creative_under_review", message: "O criativo esta em revisao." });
    const item = await prisma.adCreative.update({ where: { id: creativeId }, data: { ...creativePayload.partial().parse(req.body), isEnabled: false, reviewStatus: "draft", approvedAt: null, reviewedByUserId: null, requiresReviewAfterEdit: current.reviewStatus === "approved" } });
    if (current.reviewStatus === "approved") await prisma.adReviewLog.create({ data: { entityType: "creative", entityId: creativeId, action: "reopen_after_edit", fromStatus: "approved", toStatus: "draft", actorUserId: req.user.id } });
    return res.json({ item });
  } catch (error) { return next(error); }
}

export async function submitMyAdvertiserReview(req, res, next) {
  try {
    const { entityType, id } = z.object({ entityType: z.enum(["campaign", "creative"]), id: uuid }).parse(req.params);
    const current = entityType === "campaign"
      ? await prisma.adCampaign.findUnique({ where: { id } })
      : await prisma.adCreative.findUnique({ where: { id }, include: { campaign: true } });
    const accountId = entityType === "campaign" ? current?.advertiserAccountId : current?.campaign?.advertiserAccountId;
    if (!accountId) return res.status(404).json({ error: "ad_item_not_found" });
    const access = await membership(req.user.id, accountId);
    if (!access) return deny(res);
    if (!WRITE_ROLES.includes(access.role)) return deny(res, true);
    if (entityType === "campaign" && current.budgetCredits <= current.spentCredits) {
      return res.status(409).json({ error: "campaign_budget_required", message: "Vincule patacos à campanha antes de enviar para revisão." });
    }
    const status = current.reviewStatus || "draft";
    if (!["draft", "rejected", "changes_requested"].includes(status)) return res.status(409).json({ error: "invalid_review_transition" });
    const now = new Date();
    const item = await prisma.$transaction(async (tx) => {
      const repo = entityType === "campaign" ? tx.adCampaign : tx.adCreative;
      const updated = await repo.update({ where: { id }, data: { reviewStatus: "pending_review", submittedAt: now, reviewNotes: null } });
      await tx.adReviewLog.create({ data: { entityType, entityId: id, action: "submit", fromStatus: current.reviewStatus, toStatus: "pending_review", actorUserId: req.user.id } });
      return updated;
    });
    return res.json({ item });
  } catch (error) { return next(error); }
}
