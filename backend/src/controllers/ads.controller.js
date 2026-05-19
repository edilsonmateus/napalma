import { AdSlot } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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
  targeting: z.record(z.any()).optional().nullable()
});

const updateCampaignSchema = createCampaignSchema.partial();

const createCreativeSchema = z.object({
  slot: slotEnum,
  title: z.string().optional().nullable(),
  imageUrl: z.string().url(),
  destinationUrl: z.string().url().optional().nullable(),
  altText: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  isEnabled: z.boolean().default(true)
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
const reportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30)
});
const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(100).default(25)
});
const venueSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  venueId: z.string().uuid().optional()
});

function mapCampaign(item) {
  return {
    id: item.id,
    advertiser: item.advertiser,
    name: item.name,
    status: item.status,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    priority: item.priority,
    runInAllSlots: item.runInAllSlots,
    isEnabled: item.isEnabled,
    targeting: item.targeting,
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
      isEnabled: creative.isEnabled
    }))
  };
}

export async function listAdCampaigns(_req, res, next) {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      include: { creatives: { orderBy: { createdAt: "desc" } } },
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
    const item = await prisma.adCampaign.create({
      data: {
        ...payload,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
        createdByUserId: req.user?.id || null
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
    const item = await prisma.adCampaign.update({
      where: { id },
      data: {
        ...payload,
        startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
        endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null
      },
      include: { creatives: true }
    });
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
      data: { campaignId, ...payload }
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
    const item = await prisma.adCreative.update({
      where: { id },
      data: payload
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function getAdDelivery(req, res, next) {
  try {
    const slot = slotEnum.parse(req.params.slot);
    const now = new Date();
    const userId = req.user?.id || null;
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        isEnabled: true,
        status: "active",
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
      },
      include: {
        creatives: {
          where: { isEnabled: true, OR: [{ slot }, { slot: "explore_feed_large" }] }
        }
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
    });

    const eligible = campaigns.flatMap((campaign) =>
      campaign.creatives
        .filter((creative) => campaign.runInAllSlots || creative.slot === slot || (slot !== "explore_feed_large" && creative.slot === "explore_feed_large"))
        .map((creative) => ({ campaign, creative }))
    );

    if (eligible.length === 0) {
      return res.json({ item: null });
    }

    let filtered = eligible;
    if (userId) {
      const dailyStats = await prisma.adEventLog.groupBy({
        by: ["campaignId"],
        where: {
          userId,
          type: "impression",
          createdAt: { gte: dayStart, lte: dayEnd }
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

    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    return res.json({
      item: {
        campaignId: pick.campaign.id,
        campaignName: pick.campaign.name,
        slot,
        creativeId: pick.creative.id,
        imageUrl: pick.creative.imageUrl,
        destinationUrl: pick.creative.destinationUrl,
        altText: pick.creative.altText || pick.campaign.name,
        title: pick.creative.title
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function trackAdImpression(req, res, next) {
  try {
    const payload = adTrackSchema.parse(req.body);
    await prisma.adEventLog.create({
      data: {
        type: "impression",
        campaignId: payload.campaignId,
        creativeId: payload.creativeId,
        slot: payload.slot,
        venueId: payload.venueId || null,
        userId: req.user?.id || null,
        sessionId: payload.sessionId || null,
        userAgent: req.headers["user-agent"] || null
      }
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function trackAdClick(req, res, next) {
  try {
    const payload = adTrackSchema.parse(req.body);
    await prisma.adEventLog.create({
      data: {
        type: "click",
        campaignId: payload.campaignId,
        creativeId: payload.creativeId,
        slot: payload.slot,
        venueId: payload.venueId || null,
        userId: req.user?.id || null,
        sessionId: payload.sessionId || null,
        userAgent: req.headers["user-agent"] || null
      }
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function getAdsReport(req, res, next) {
  try {
    const { days } = reportQuerySchema.parse(req.query || {});
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [impressionsByCampaign, clicksByCampaign, impressionsBySlot, clicksBySlot, dailyEvents] = await Promise.all([
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
      prisma.adEventLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, type: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    const campaigns = await prisma.adCampaign.findMany({
      select: { id: true, name: true, advertiser: true, status: true }
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
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0
      };
    }).sort((a, b) => b.impressions - a.impressions);

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
        impressions: slots.reduce((sum, item) => sum + item.impressions, 0),
        clicks: slots.reduce((sum, item) => sum + item.clicks, 0)
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
