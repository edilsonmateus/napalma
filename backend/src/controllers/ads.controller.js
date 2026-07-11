import { AdSlot } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { isFeatureEnabled } from "../middlewares/featureFlags.js";
import { AD_PLACEMENTS } from "../config/adPlacements.js";
import { adTargetingSchema } from "../utils/adTargetingPolicy.js";
import { safeHttpUrl } from "../utils/safeUrl.js";

const slotEnum = z.nativeEnum(AdSlot);

const createCampaignSchema = z.object({
  advertiser: z.string().min(2),
  name: z.string().min(2),
  status: z.enum(["draft", "active", "paused", "ended"]).default("draft"),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(10).default(1),
  runInAllSlots: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  targeting: adTargetingSchema.optional().nullable()
});

const updateCampaignSchema = createCampaignSchema.partial();

const createCreativeSchema = z.object({
  slot: slotEnum,
  title: z.string().optional().nullable(),
  imageUrl: z.string().url(),
  destinationUrl: safeHttpUrl.optional().nullable(),
  altText: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  isEnabled: z.boolean().default(true),
  storageProvider: z.string().max(40).optional().nullable(),
  storageKey: z.string().max(500).optional().nullable(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().nullable(),
  fileSizeBytes: z.number().int().positive().max(5 * 1024 * 1024).optional().nullable(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/).optional().nullable(),
  assetVersion: z.number().int().positive().optional()
});

const updateCreativeSchema = createCreativeSchema.partial();

const idSchema = z.object({ id: z.string().uuid() });
const campaignIdSchema = z.object({ campaignId: z.string().uuid() });
const adTrackSchema = z.object({
  campaignId: z.string().uuid(),
  creativeId: z.string().uuid(),
  slot: slotEnum,
  sessionId: z.string().max(120).optional().nullable(),
  venueId: z.string().uuid().optional().nullable()
});
const deliveryQuerySchema = z.object({
  sessionId: z.string().min(8).max(160).optional(),
  venueId: z.string().uuid().optional(),
  city: z.string().trim().min(2).max(100).optional(),
  region: z.string().trim().min(2).max(100).optional(),
  preview: z.enum(["true", "false"]).optional().transform((value) => value === "true")
});
const deliveryTokenSchema = z.object({ token: z.string().min(32).max(160) });
const deliveryImpressionSchema = z.object({
  sessionId: z.string().min(8).max(160).optional(),
  venueId: z.string().uuid().optional(),
  visibilityRatio: z.number().min(0.5).max(1),
  viewedMs: z.number().int().min(1000).max(120000)
});
const reportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30)
});
const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(100).default(25)
});
const healthQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(168).default(24)
});
const venueSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  venueId: z.string().uuid().optional()
});

function mapCampaign(item) {
  return {
    id: item.id,
    advertiser: item.advertiser,
    advertiserAccountId: item.advertiserAccountId || null,
    advertiserAccount: item.advertiserAccount || null,
    name: item.name,
    status: item.status,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    priority: item.priority,
    runInAllSlots: item.runInAllSlots,
    isEnabled: item.isEnabled,
    targeting: item.targeting,
    reviewStatus: item.reviewStatus || null,
    reviewNotes: item.reviewNotes || null,
    requiresReviewAfterEdit: Boolean(item.requiresReviewAfterEdit),
    createdAt: item.createdAt,
    creatives: item.creatives.map((creative) => ({
      id: creative.id,
      slot: creative.slot,
      title: creative.title,
      imageUrl: creative.imageUrl,
      destinationUrl: creative.destinationUrl,
      altText: creative.altText,
      width: creative.width,
      height: creative.height,
      isEnabled: creative.isEnabled,
      storageProvider: creative.storageProvider,
      storageKey: creative.storageKey,
      mimeType: creative.mimeType,
      fileSizeBytes: creative.fileSizeBytes,
      checksum: creative.checksum,
      assetVersion: creative.assetVersion
      ,reviewStatus: creative.reviewStatus || null,
      reviewNotes: creative.reviewNotes || null,
      requiresReviewAfterEdit: Boolean(creative.requiresReviewAfterEdit)
    }))
  };
}

function normalizeTarget(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

function requestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

function fingerprint(value) {
  if (!value) return null;
  const salt = process.env.ADS_TRACKING_SALT || process.env.JWT_SECRET || "77gira-ads-development";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function placementFor(slot) {
  return AD_PLACEMENTS.find((item) => item.key === slot) || null;
}

function isCampaignContextEligible(campaign, context) {
  const targeting = campaign.targeting && typeof campaign.targeting === "object" ? campaign.targeting : {};
  const asList = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const matches = (values, current) => {
    const allowed = asList(values).map(normalizeTarget).filter(Boolean);
    return allowed.length === 0 || !current || allowed.includes(normalizeTarget(current));
  };
  return matches(targeting.cities || targeting.city, context.city)
    && matches(targeting.regions || targeting.region, context.region)
    && matches(targeting.venueIds || targeting.venueId, context.venueId);
}

function isReviewApproved(status) {
  return !isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED") || !status || status === "approved";
}

function dailyPacingCap(campaign, now) {
  const targeting = campaign.targeting && typeof campaign.targeting === "object" ? campaign.targeting : {};
  const explicitCap = Number(targeting.dailyImpressionCap);
  if (Number.isInteger(explicitCap) && explicitCap > 0) return explicitCap;
  const remaining = Math.max(0, Number(campaign.budgetCredits || 0) - Number(campaign.spentCredits || 0));
  const end = campaign.endsAt ? new Date(campaign.endsAt) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const days = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  return Math.max(1, Math.ceil(remaining / days));
}

function deliveryPayload(campaign, creative, slot, token = null) {
  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    slot,
    creativeId: creative.id,
    imageUrl: creative.imageUrl,
    altText: creative.altText || campaign.name,
    title: creative.title,
    destinationAvailable: Boolean(creative.destinationUrl),
    deliveryToken: token
  };
}

export async function listAdCampaigns(_req, res, next) {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      include: {
        advertiserAccount: { select: { id: true, name: true, status: true } },
        creatives: { orderBy: { createdAt: "desc" } }
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    });
    res.json({ items: campaigns.map(mapCampaign) });
  } catch (error) {
    next(error);
  }
}

export async function createAdCampaign(req, res, next) {
  try {
    const payload = createCampaignSchema.parse(req.body);
    if (isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED") && payload.status === "active") {
      return res.status(409).json({ error: "review_required", message: "Envie e aprove a campanha antes de ativa-la." });
    }
    const item = await prisma.adCampaign.create({
      data: {
        ...payload,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
        createdByUserId: req.user?.id || null
        ,reviewStatus: isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED") ? "draft" : undefined
      },
      include: { creatives: true }
    });
    res.status(201).json({ item: mapCampaign(item) });
  } catch (error) {
    next(error);
  }
}

export async function updateAdCampaign(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateCampaignSchema.parse(req.body);
    const workflow = isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED");
    const current = workflow ? await prisma.adCampaign.findUnique({ where: { id } }) : null;
    if (workflow && payload.status === "active" && current?.reviewStatus && current.reviewStatus !== "approved") {
      return res.status(409).json({ error: "review_required", message: "A campanha precisa estar aprovada antes da ativacao." });
    }
    const sensitive = ["advertiser", "name", "startsAt", "endsAt", "priority", "runInAllSlots", "targeting"].some((key) => Object.prototype.hasOwnProperty.call(payload, key));
    const reopen = workflow && current?.reviewStatus === "approved" && sensitive;
    const item = await prisma.adCampaign.update({
      where: { id },
      data: {
        ...payload,
        startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null
        ,reviewStatus: reopen ? "draft" : undefined,
        approvedAt: reopen ? null : undefined,
        reviewedByUserId: reopen ? null : undefined,
        requiresReviewAfterEdit: reopen ? true : undefined
      },
      include: { creatives: true }
    });
    if (reopen) await prisma.adReviewLog.create({ data: { entityType: "campaign", entityId: id, action: "reopen_after_edit", fromStatus: "approved", toStatus: "draft", actorUserId: req.user.id } });
    res.json({ item: mapCampaign(item) });
  } catch (error) {
    next(error);
  }
}

export async function createAdCreative(req, res, next) {
  try {
    const { campaignId } = campaignIdSchema.parse(req.params);
    const payload = createCreativeSchema.parse(req.body);
    const item = await prisma.adCreative.create({
      data: { campaignId, ...payload, reviewStatus: isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED") ? "draft" : undefined }
    });
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
}

export async function updateAdCreative(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = updateCreativeSchema.parse(req.body);
    const workflow = isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED");
    const current = workflow ? await prisma.adCreative.findUnique({ where: { id } }) : null;
    const sensitive = ["slot", "title", "imageUrl", "destinationUrl", "altText", "storageProvider", "storageKey", "checksum"].some((key) => Object.prototype.hasOwnProperty.call(payload, key));
    const reopen = workflow && current?.reviewStatus === "approved" && sensitive;
    const item = await prisma.adCreative.update({
      where: { id },
      data: { ...payload, reviewStatus: reopen ? "draft" : undefined, approvedAt: reopen ? null : undefined, reviewedByUserId: reopen ? null : undefined, requiresReviewAfterEdit: reopen ? true : undefined }
    });
    if (reopen) await prisma.adReviewLog.create({ data: { entityType: "creative", entityId: id, action: "reopen_after_edit", fromStatus: "approved", toStatus: "draft", actorUserId: req.user.id } });
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function getAdDelivery(req, res, next) {
  try {
    const slot = slotEnum.parse(req.params.slot);
    const context = deliveryQuerySchema.parse(req.query || {});
    if (!isFeatureEnabled("ADS_CREDITS_PURCHASE_ENABLED")) {
      return res.json({
        item: null,
        blockedReason: "credits_not_enabled",
        message: "Ad delivery is blocked until credits/patacos are enabled."
      });
    }
    const placement = placementFor(slot);
    if (!placement?.isActive) {
      return res.json({ item: null, blockedReason: "slot_not_available" });
    }
    const now = new Date();
    const userId = req.user?.id || null;
    const sessionHash = fingerprint(context.sessionId || null);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const [usedInventory, campaigns] = await Promise.all([
      prisma.adEventLog.count({ where: { slot, type: "impression", createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.adCampaign.findMany({
      where: {
        isEnabled: true,
        status: "active",
        budgetCredits: { gt: 0 },
        ...(isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED")
          ? { OR: [{ reviewStatus: null }, { reviewStatus: "approved" }] }
          : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
        ]
      },
      include: {
        advertiserAccount: { select: { status: true } },
        creatives: {
          where: {
            isEnabled: true,
            AND: [
              { slot },
              ...(isFeatureEnabled("ADS_REVIEW_WORKFLOW_ENABLED")
                ? [{ OR: [{ reviewStatus: null }, { reviewStatus: "approved" }] }]
                : [])
            ]
          }
        }
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
    })
    ]);

    if (usedInventory >= Number(placement.inventory?.dailyImpressionCap || 0)) {
      return res.json({ item: null, blockedReason: "inventory_exhausted", message: "Este posicionamento atingiu a capacidade planejada hoje." });
    }

    const eligible = campaigns.filter((campaign) => (
      campaign.spentCredits < campaign.budgetCredits
      && (!campaign.advertiserAccountId || campaign.advertiserAccount?.status === "active")
      && isReviewApproved(campaign.reviewStatus)
      && isCampaignContextEligible(campaign, context)
    )).flatMap((campaign) =>
      campaign.creatives
        .filter((creative) => isReviewApproved(creative.reviewStatus))
        .map((creative) => ({ campaign, creative }))
    );

    if (eligible.length === 0) {
      return res.json({ item: null });
    }

    let filtered = eligible;
    if (userId || sessionHash) {
      const dailyStats = await prisma.adDelivery.groupBy({
        by: ["campaignId"],
        where: {
          ...(userId ? { userId } : { sessionHash }),
          impressionRecordedAt: { gte: dayStart, lte: dayEnd }
        },
        _count: { _all: true }
      });
      const byCampaign = new Map(dailyStats.map((item) => [item.campaignId, item._count._all]));
      filtered = eligible.filter((item) => {
        const shown = byCampaign.get(item.campaign.id) || 0;
        return shown < item.campaign.frequencyCapDaily;
      });
      if (filtered.length === 0) {
        return res.json({ item: null });
      }
    }

    const deliveryStats = await prisma.adEventLog.groupBy({
      by: ["campaignId"],
      where: { type: "impression", createdAt: { gte: dayStart, lte: dayEnd }, campaignId: { in: filtered.map((item) => item.campaign.id) } },
      _count: { _all: true }
    });
    const deliveredToday = new Map(deliveryStats.map((item) => [item.campaignId, item._count._all]));
    filtered = filtered.filter((item) => (deliveredToday.get(item.campaign.id) || 0) < dailyPacingCap(item.campaign, now));
    if (filtered.length === 0) {
      return res.json({ item: null, blockedReason: "daily_pacing_reached", message: "As campanhas elegíveis já atingiram o ritmo diário planejado." });
    }
    const pick = [...filtered].sort((a, b) => {
      const score = (item) => {
        const campaign = item.campaign;
        const remainingRatio = Math.max(0, campaign.budgetCredits - campaign.spentCredits) / Math.max(1, campaign.budgetCredits);
        const deliveryPressure = (deliveredToday.get(campaign.id) || 0) / Math.max(1, campaign.budgetCredits);
        return (campaign.priority * 10) + (remainingRatio * 5) - (deliveryPressure * 8) + Math.random();
      };
      return score(b) - score(a);
    })[0];

    if (context.preview) {
      return res.json({ item: deliveryPayload(pick.campaign, pick.creative, slot), preview: true });
    }

    const token = randomBytes(24).toString("base64url");
    await prisma.adDelivery.create({
      data: {
        token,
        slot,
        campaignId: pick.campaign.id,
        creativeId: pick.creative.id,
        venueId: context.venueId || null,
        userId,
        sessionHash,
        context: { city: context.city || null, region: context.region || null },
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000)
      }
    });
    return res.json({
      item: deliveryPayload(pick.campaign, pick.creative, slot, token)
    });
  } catch (error) {
    next(error);
  }
}

export async function trackDeliveredImpression(req, res, next) {
  try {
    const { token } = deliveryTokenSchema.parse(req.params);
    const payload = deliveryImpressionSchema.parse(req.body);
    const sessionHash = fingerprint(payload.sessionId || null);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.adDelivery.findUnique({
        where: { token },
        include: { campaign: true, creative: true }
      });
      if (!delivery) return { status: 404, error: "delivery_not_found" };
      if (delivery.expiresAt < now) return { status: 410, error: "delivery_expired" };
      if (delivery.sessionHash && delivery.sessionHash !== sessionHash) return { status: 409, error: "delivery_session_mismatch" };
      if (delivery.venueId && payload.venueId && delivery.venueId !== payload.venueId) return { status: 409, error: "delivery_context_mismatch" };
      if (delivery.impressionRecordedAt) return { status: 200, duplicate: true };
      if (!delivery.campaign.isEnabled || delivery.campaign.status !== "active" || delivery.campaign.spentCredits >= delivery.campaign.budgetCredits) {
        return { status: 409, error: "campaign_not_deliverable" };
      }
      // A session can legitimately browse several cards, but a burst of valid
      // impressions is a strong automation signal. Do not charge the campaign
      // when that limit is crossed; the admin health screen will surface it.
      if (sessionHash) {
        const recentImpressions = await tx.adEventLog.count({
          where: {
            type: "impression",
            sessionId: sessionHash,
            createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) }
          }
        });
        if (recentImpressions >= 15) return { status: 429, error: "suspicious_delivery_frequency" };
      }
      const claimed = await tx.adDelivery.updateMany({
        where: { id: delivery.id, impressionRecordedAt: null },
        data: { renderedAt: now, impressionRecordedAt: now }
      });
      if (claimed.count !== 1) return { status: 200, duplicate: true };

      await tx.adEventLog.create({
        data: {
          type: "impression",
          deliveryId: delivery.id,
          campaignId: delivery.campaignId,
          creativeId: delivery.creativeId,
          slot: delivery.slot,
          venueId: delivery.venueId || payload.venueId || null,
          userId: req.user?.id || delivery.userId || null,
          sessionId: sessionHash,
          userAgent: req.headers["user-agent"] || null,
          ipHash: fingerprint(requestIp(req))
        }
      });
      const campaign = await tx.adCampaign.update({
        where: { id: delivery.campaignId },
        data: { spentCredits: { increment: 1 } },
        select: { advertiserAccountId: true, budgetCredits: true, spentCredits: true }
      });
      if (campaign.advertiserAccountId) {
        await tx.adCreditLedgerEntry.create({
          data: {
            accountId: campaign.advertiserAccountId,
            campaignId: delivery.campaignId,
            type: "delivery_charge",
            delta: -1,
            balanceAfter: Math.max(0, campaign.budgetCredits - campaign.spentCredits),
            idempotencyKey: `delivery:${delivery.id}`,
            description: "Pataco consumido por impressão válida.",
            metadata: { deliveryToken: token, slot: delivery.slot }
          }
        });
      }
      return { status: 201, charged: 1 };
    });
    if (result.error) return res.status(result.status).json(result);
    return res.status(result.status).json({ ok: true, duplicate: Boolean(result.duplicate), charged: result.charged || 0 });
  } catch (error) {
    next(error);
  }
}

export async function redirectDeliveredClick(req, res, next) {
  try {
    const { token } = deliveryTokenSchema.parse(req.params);
    const delivery = await prisma.adDelivery.findUnique({
      where: { token },
      include: { campaign: true, creative: true }
    });
    if (!delivery || delivery.expiresAt < new Date() || !delivery.creative.destinationUrl) {
      return res.status(404).send("Destino publicitário indisponível.");
    }
    const destination = new URL(delivery.creative.destinationUrl);
    if (!/^https?:$/.test(destination.protocol)) return res.status(400).send("Destino publicitário inválido.");
    destination.searchParams.set("utm_source", "77gira");
    destination.searchParams.set("utm_medium", "app");
    destination.searchParams.set("utm_campaign", delivery.campaign.name);
    destination.searchParams.set("utm_content", delivery.slot);
    await prisma.$transaction(async (tx) => {
      const marked = await tx.adDelivery.updateMany({ where: { id: delivery.id, clickRecordedAt: null }, data: { clickRecordedAt: new Date() } });
      if (marked.count !== 1) return;
      await tx.adEventLog.create({
        data: {
          type: "click",
          deliveryId: delivery.id,
          campaignId: delivery.campaignId,
          creativeId: delivery.creativeId,
          slot: delivery.slot,
          venueId: delivery.venueId || null,
          userId: req.user?.id || delivery.userId || null,
          sessionId: delivery.sessionHash,
          userAgent: req.headers["user-agent"] || null,
          ipHash: fingerprint(requestIp(req))
        }
      });
    });
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, destination.toString());
  } catch (error) {
    next(error);
  }
}

export async function trackAdImpression(req, res, next) {
  try {
    adTrackSchema.parse(req.body);
    res.status(410).json({
      error: "delivery_token_required",
      message: "Impressões devem ser registradas pelo token de entrega validado."
    });
  } catch (error) {
    next(error);
  }
}

export async function trackAdClick(req, res, next) {
  try {
    adTrackSchema.parse(req.body);
    res.status(410).json({
      error: "delivery_token_required",
      message: "Cliques devem passar pelo redirecionador de entrega validado."
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdsHealth(req, res, next) {
  try {
    const { hours } = healthQuerySchema.parse(req.query || {});
    const now = new Date();
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [deliveries, recentEvents, campaigns, impressionsBySlot] = await Promise.all([
      prisma.adDelivery.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, campaignId: true, slot: true, sessionHash: true, createdAt: true, impressionRecordedAt: true, clickRecordedAt: true, expiresAt: true }
      }),
      prisma.adEventLog.findMany({
        where: { createdAt: { gte: since } },
        select: { campaignId: true, sessionId: true, type: true, createdAt: true }
      }),
      prisma.adCampaign.findMany({
        where: { status: "active", isEnabled: true },
        select: { id: true, name: true, advertiser: true, endsAt: true, budgetCredits: true, spentCredits: true, reviewStatus: true, creatives: { select: { isEnabled: true, reviewStatus: true } } }
      }),
      prisma.adEventLog.groupBy({ by: ["slot"], where: { type: "impression", createdAt: { gte: dayStart } }, _count: { _all: true } })
    ]);

    const alerts = [];
    const clickWithoutView = deliveries.filter((item) => item.clickRecordedAt && !item.impressionRecordedAt);
    if (clickWithoutView.length) alerts.push({ severity: "warning", code: "click_without_view", count: clickWithoutView.length, title: "Cliques sem impressão válida", detail: "Revise destinos, tempo de visibilidade e possíveis automações." });

    const abandonedDeliveries = deliveries.filter((item) => item.expiresAt < now && !item.impressionRecordedAt);
    if (abandonedDeliveries.length >= 10) alerts.push({ severity: "info", code: "unviewed_deliveries", count: abandonedDeliveries.length, title: "Entregas não visualizadas", detail: "Solicitações expiraram sem atingir o critério de visualização." });

    const impressionsBySession = new Map();
    for (const event of recentEvents) {
      if (event.type !== "impression" || !event.sessionId) continue;
      impressionsBySession.set(event.sessionId, (impressionsBySession.get(event.sessionId) || 0) + 1);
    }
    const highFrequencySessions = [...impressionsBySession.values()].filter((count) => count > 15).length;
    if (highFrequencySessions) alerts.push({ severity: "warning", code: "high_session_frequency", count: highFrequencySessions, title: "Frequência anormal por sessão", detail: "Uma ou mais sessões ultrapassaram 15 impressões no período monitorado." });

    const campaignEvents = new Map();
    for (const event of recentEvents) {
      const current = campaignEvents.get(event.campaignId) || { impressions: 0, clicks: 0 };
      if (event.type === "impression") current.impressions += 1;
      if (event.type === "click") current.clicks += 1;
      campaignEvents.set(event.campaignId, current);
    }
    const highCtr = [...campaignEvents.entries()].filter(([, value]) => value.impressions >= 12 && value.clicks / value.impressions > 0.6).length;
    if (highCtr) alerts.push({ severity: "warning", code: "high_ctr", count: highCtr, title: "CTR fora do padrão", detail: "Campanhas com volume suficiente e CTR acima de 60% devem ser revisadas." });

    const blockedCampaigns = campaigns.filter((campaign) => (
      !isReviewApproved(campaign.reviewStatus)
      || campaign.spentCredits >= campaign.budgetCredits
      || (campaign.endsAt && campaign.endsAt < now)
      || !campaign.creatives.some((creative) => creative.isEnabled && isReviewApproved(creative.reviewStatus))
    ));
    if (blockedCampaigns.length) alerts.push({ severity: "warning", code: "campaign_delivery_blocked", count: blockedCampaigns.length, title: "Campanhas ativas bloqueadas", detail: "Há campanhas ativas sem condição completa de entrega." });

    const impressionsMap = new Map(impressionsBySlot.map((item) => [item.slot, item._count._all]));
    const inventory = AD_PLACEMENTS.map((placement) => {
      const used = impressionsMap.get(placement.key) || 0;
      const capacity = Number(placement.inventory?.dailyImpressionCap || 0);
      return { slot: placement.key, capacity, used, remaining: Math.max(0, capacity - used), utilization: capacity ? Number(((used / capacity) * 100).toFixed(2)) : 0 };
    });
    const exhaustedSlots = inventory.filter((item) => item.remaining === 0 && item.capacity > 0);
    if (exhaustedSlots.length) alerts.push({ severity: "critical", code: "inventory_exhausted", count: exhaustedSlots.length, title: "Inventário esgotado", detail: "Um ou mais slots atingiram a capacidade diária de impressões válidas." });

    res.json({
      summary: {
        hours,
        deliveries: deliveries.length,
        validImpressions: recentEvents.filter((item) => item.type === "impression").length,
        clicks: recentEvents.filter((item) => item.type === "click").length,
        alertCount: alerts.length,
        criticalCount: alerts.filter((item) => item.severity === "critical").length
      },
      alerts,
      inventory,
      blockedCampaigns: blockedCampaigns.map((item) => ({ id: item.id, name: item.name, advertiser: item.advertiser }))
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdsReport(req, res, next) {
  try {
    const { days } = reportQuerySchema.parse(req.query || {});
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [impressionsByCampaign, clicksByCampaign, impressionsBySlot, clicksBySlot, deliveryRequestsBySlot, renderedBySlot, dailyEvents] = await Promise.all([
      prisma.adEventLog.groupBy({
        by: ["campaignId"],
        where: { type: "impression", createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["campaignId"],
        where: { type: "click", createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["slot"],
        where: { type: "impression", createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["slot"],
        where: { type: "click", createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.adDelivery.groupBy({
        by: ["slot"],
        where: { createdAt: { gte: since } },
        _count: { _all: true }
      }),
      prisma.adDelivery.groupBy({
        by: ["slot"],
        where: { createdAt: { gte: since }, renderedAt: { not: null } },
        _count: { _all: true }
      }),
      prisma.adEventLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, type: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const campaigns = await prisma.adCampaign.findMany({
      select: { id: true, name: true, advertiser: true, status: true, endsAt: true, budgetCredits: true, spentCredits: true, targeting: true }
    });
    const byId = new Map(campaigns.map((item) => [item.id, item]));
    const impMap = new Map(impressionsByCampaign.map((item) => [item.campaignId, item._count._all]));
    const clickMap = new Map(clicksByCampaign.map((item) => [item.campaignId, item._count._all]));

    const campaignsReport = campaigns.map((campaign) => {
      const impressions = impMap.get(campaign.id) || 0;
      const clicks = clickMap.get(campaign.id) || 0;
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        advertiser: campaign.advertiser,
        status: campaign.status,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        dailyPacingCap: dailyPacingCap(campaign, new Date()),
        remainingPatacos: Math.max(0, campaign.budgetCredits - campaign.spentCredits)
      };
    }).sort((a, b) => b.impressions - a.impressions);

    const slotImp = new Map(impressionsBySlot.map((item) => [item.slot, item._count._all]));
    const slotClk = new Map(clicksBySlot.map((item) => [item.slot, item._count._all]));
    const slotRequests = new Map(deliveryRequestsBySlot.map((item) => [item.slot, item._count._all]));
    const slotRendered = new Map(renderedBySlot.map((item) => [item.slot, item._count._all]));
    const slots = ["explore_feed_large", "venue_detail_inline", "radar_header"].map((slot) => {
      const impressions = slotImp.get(slot) || 0;
      const clicks = slotClk.get(slot) || 0;
      const placement = placementFor(slot);
      const dailyCapacity = Number(placement?.inventory?.dailyImpressionCap || 0);
      const inventoryCapacity = dailyCapacity * days;
      return {
        slot,
        requests: slotRequests.get(slot) || 0,
        rendered: slotRendered.get(slot) || 0,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        inventoryCapacity,
        inventoryRemaining: Math.max(0, inventoryCapacity - impressions),
        fillRate: inventoryCapacity > 0 ? Number(((impressions / inventoryCapacity) * 100).toFixed(2)) : 0,
        viewabilityRate: (slotRequests.get(slot) || 0) > 0
          ? Number(((impressions / (slotRequests.get(slot) || 1)) * 100).toFixed(2))
          : 0
      };
    });

    const dailyMap = new Map();
    for (const event of dailyEvents) {
      const key = new Date(event.createdAt).toLocaleDateString("pt-BR");
      if (!dailyMap.has(key)) dailyMap.set(key, { date: key, impressions: 0, clicks: 0, ctr: 0 });
      const row = dailyMap.get(key);
      if (event.type === "impression") row.impressions += 1;
      if (event.type === "click") row.clicks += 1;
    }
    const daily = Array.from(dailyMap.values()).map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0
    }));

    res.json({
      summary: {
        days,
        since,
        requests: slots.reduce((sum, item) => sum + item.requests, 0),
        rendered: slots.reduce((sum, item) => sum + item.rendered, 0),
        impressions: slots.reduce((sum, item) => sum + item.impressions, 0),
        clicks: slots.reduce((sum, item) => sum + item.clicks, 0),
        inventoryCapacity: slots.reduce((sum, item) => sum + item.inventoryCapacity, 0),
        inventoryRemaining: slots.reduce((sum, item) => sum + item.inventoryRemaining, 0)
      },
      campaigns: campaignsReport,
      slots,
      daily
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdsActivity(req, res, next) {
  try {
    const { limit } = activityQuerySchema.parse(req.query || {});
    const logs = await prisma.adEventLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { id: true, name: true, advertiser: true } },
        creative: { select: { id: true, slot: true, title: true } }
      }
    });
    res.json({
      items: logs.map((item) => ({
        id: item.id,
        type: item.type,
        slot: item.slot,
        createdAt: item.createdAt,
        campaignId: item.campaignId,
        campaignName: item.campaign?.name || "Campanha",
        advertiser: item.campaign?.advertiser || "",
        creativeId: item.creativeId,
        creativeTitle: item.creative?.title || ""
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function getVenueAdsSummary(req, res, next) {
  try {
    const { days, venueId } = venueSummaryQuerySchema.parse(req.query || {});
    const since = new Date();
    since.setDate(since.getDate() - days);

    let scopedVenueIds = [];
    if (req.user?.role === "admin") {
      if (venueId) {
        scopedVenueIds = [venueId];
      } else {
        const all = await prisma.venue.findMany({ select: { id: true } });
        scopedVenueIds = all.map((item) => item.id);
      }
    } else if (req.user?.role === "venue_manager") {
      const managed = await prisma.venue.findMany({
        where: {
          OR: [
            { managerUserId: req.user.id },
            { managerAccesses: { some: { userId: req.user.id } } }
          ]
        },
        select: { id: true }
      });
      const managedIds = managed.map((item) => item.id);
      if (venueId && !managedIds.includes(venueId)) {
        return res.status(403).json({ error: "forbidden", message: "Sem acesso a esta casa." });
      }
      scopedVenueIds = venueId ? [venueId] : managedIds;
    } else {
      return res.status(403).json({ error: "forbidden", message: "Sem permissao para este relatorio." });
    }

    if (scopedVenueIds.length === 0) {
      return res.json({
        summary: { days, impressions: 0, clicks: 0, ctr: 0 },
        slots: [],
        daily: [],
        campaigns: []
      });
    }

    const whereBase = {
      venueId: { in: scopedVenueIds },
      createdAt: { gte: since }
    };

    const [impressionsBySlot, clicksBySlot, byCampaignImpressions, byCampaignClicks, dailyEvents] = await Promise.all([
      prisma.adEventLog.groupBy({
        by: ["slot"],
        where: { ...whereBase, type: "impression" },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["slot"],
        where: { ...whereBase, type: "click" },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["campaignId"],
        where: { ...whereBase, type: "impression" },
        _count: { _all: true }
      }),
      prisma.adEventLog.groupBy({
        by: ["campaignId"],
        where: { ...whereBase, type: "click" },
        _count: { _all: true }
      }),
      prisma.adEventLog.findMany({
        where: whereBase,
        select: { createdAt: true, type: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const slotImp = new Map(impressionsBySlot.map((item) => [item.slot, item._count._all]));
    const slotClk = new Map(clicksBySlot.map((item) => [item.slot, item._count._all]));
    const slots = ["explore_feed_large", "venue_detail_inline", "radar_header"].map((slot) => {
      const impressions = slotImp.get(slot) || 0;
      const clicks = slotClk.get(slot) || 0;
      return {
        slot,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0
      };
    });

    const campaignImp = new Map(byCampaignImpressions.map((item) => [item.campaignId, item._count._all]));
    const campaignClk = new Map(byCampaignClicks.map((item) => [item.campaignId, item._count._all]));
    const campaignIds = Array.from(new Set([...campaignImp.keys(), ...campaignClk.keys()]));
    const campaignsRaw = campaignIds.length
      ? await prisma.adCampaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, name: true, advertiser: true } })
      : [];

    const campaigns = campaignsRaw
      .map((item) => {
        const impressions = campaignImp.get(item.id) || 0;
        const clicks = campaignClk.get(item.id) || 0;
        return {
          campaignId: item.id,
          campaignName: item.name,
          advertiser: item.advertiser,
          impressions,
          clicks,
          ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0
        };
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10);

    const dailyMap = new Map();
    for (const event of dailyEvents) {
      const key = new Date(event.createdAt).toLocaleDateString("pt-BR");
      if (!dailyMap.has(key)) dailyMap.set(key, { date: key, impressions: 0, clicks: 0, ctr: 0 });
      const row = dailyMap.get(key);
      if (event.type === "impression") row.impressions += 1;
      if (event.type === "click") row.clicks += 1;
    }
    const daily = Array.from(dailyMap.values()).map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0
    }));

    const totalImpressions = slots.reduce((sum, item) => sum + item.impressions, 0);
    const totalClicks = slots.reduce((sum, item) => sum + item.clicks, 0);

    res.json({
      summary: {
        days,
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0
      },
      slots,
      daily,
      campaigns
    });
  } catch (error) {
    next(error);
  }
}
