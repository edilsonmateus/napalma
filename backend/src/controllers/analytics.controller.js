import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const TRACKABLE_EVENT_TYPES = new Set([
  "explore_view",
  "venue_view",
  "event_view",
  "route_click",
  "route_app_click",
  "radar_save",
  "radar_remove",
  "event_share",
  "attendance_yes",
  "attendance_no",
  "region_filter",
  "date_filter",
  "hour_filter",
  "live_filter",
  "search"
]);

const analyticsEventSchema = z.object({
  type: z.string().min(2).max(80),
  visitorId: z.string().max(120).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  artistId: z.string().uuid().optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable()
});

function getSinceDate(days = 30) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - safeDays);
  return { safeDays, since };
}

function sumTotals(totals, types) {
  return types.reduce((sum, type) => sum + (totals[type] || 0), 0);
}

function getBestHour(byHour) {
  const entries = Object.entries(byHour);
  if (entries.length === 0) return null;
  const [hour, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return {
    hour: Number(hour),
    label: `${String(hour).padStart(2, "0")}:00`,
    count
  };
}

export async function trackAnalyticsEvent(req, res, next) {
  try {
    const payload = analyticsEventSchema.parse(req.body);
    if (!TRACKABLE_EVENT_TYPES.has(payload.type)) {
      return res.status(400).json({ message: "Tipo de evento de analytics invalido." });
    }

    const visitorId = payload.visitorId || null;
    const userId = req.user?.id || payload.userId || null;

    await prisma.analyticsEvent.create({
      data: {
        type: payload.type,
        visitorId,
        userId,
        venueId: payload.venueId || null,
        eventId: payload.eventId || null,
        artistId: payload.artistId || null,
        region: payload.region || null,
        city: payload.city || null,
        state: payload.state || null,
        source: payload.source || null,
        metadata: payload.metadata || undefined,
        userAgent: req.get("user-agent") || null
      }
    });

    if (visitorId) {
      await prisma.audienceVisitor.upsert({
        where: { visitorId },
        update: {
          userId: userId || undefined,
          linkedAt: userId ? new Date() : undefined,
          lastSeenAt: new Date(),
          hits: { increment: 1 }
        },
        create: {
          visitorId,
          userId: userId || undefined,
          linkedAt: userId ? new Date() : undefined
        }
      });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

export async function getImpactSummary(req, res, next) {
  try {
    const { safeDays, since } = getSinceDate(req.query.days);
    const venueId = req.query.venueId ? String(req.query.venueId) : null;
    const where = {
      createdAt: { gte: since },
      ...(venueId ? { venueId } : {})
    };

    const byType = await prisma.analyticsEvent.groupBy({
      by: ["type"],
      where,
      _count: { _all: true }
    });

    const totals = byType.reduce((acc, item) => {
      acc[item.type] = item._count._all;
      return acc;
    }, {});

    const topEvents = await prisma.analyticsEvent.groupBy({
      by: ["eventId"],
      where: { ...where, eventId: { not: null } },
      _count: { _all: true }
    });

    const topRegions = await prisma.analyticsEvent.groupBy({
      by: ["region"],
      where: { ...where, region: { not: null } },
      _count: { _all: true }
    });

    const byHourRows = await prisma.analyticsEvent.findMany({
      where,
      select: { createdAt: true }
    });
    const byHour = byHourRows.reduce((acc, row) => {
      const hour = row.createdAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const sortedTopEvents = topEvents.sort((a, b) => b._count._all - a._count._all).slice(0, 8);
    const eventIds = sortedTopEvents.map((item) => item.eventId).filter(Boolean);
    const eventRecords = eventIds.length
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            title: true,
            venue: { select: { name: true } }
          }
        })
      : [];
    const eventById = new Map(eventRecords.map((event) => [event.id, event]));

    const routeProviderRows = await prisma.analyticsEvent.findMany({
      where: { ...where, type: "route_app_click" },
      select: { metadata: true }
    });
    const routeProvidersMap = routeProviderRows.reduce((acc, row) => {
      const provider = row.metadata && typeof row.metadata === "object"
        ? String(row.metadata.provider || "outros")
        : "outros";
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {});

    const metrics = {
      venueViews: sumTotals(totals, ["venue_view"]),
      eventViews: sumTotals(totals, ["event_view"]),
      partiuAgora: sumTotals(totals, ["route_click"]),
      routeClicks: sumTotals(totals, ["route_app_click"]),
      radarSaves: sumTotals(totals, ["radar_save"]),
      shares: sumTotals(totals, ["event_share"]),
      attendanceYes: sumTotals(totals, ["attendance_yes"]),
      searches: sumTotals(totals, ["search"]),
      regionFilters: sumTotals(totals, ["region_filter"]),
      liveFilters: sumTotals(totals, ["live_filter"])
    };

    return res.json({
      days: safeDays,
      generatedAt: new Date().toISOString(),
      metrics,
      totals,
      topEvents: sortedTopEvents,
      topEventsDetailed: sortedTopEvents.map((item) => {
        const event = eventById.get(item.eventId);
        return {
          eventId: item.eventId,
          title: event?.title || "Evento sem nome",
          venue: event?.venue?.name || "",
          count: item._count._all
        };
      }),
      topRegions: topRegions.sort((a, b) => b._count._all - a._count._all).slice(0, 8),
      topRegionsDetailed: topRegions
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 8)
        .map((item) => ({ region: item.region, count: item._count._all })),
      routeProviders: Object.entries(routeProvidersMap)
        .map(([provider, count]) => ({ provider, count }))
        .sort((a, b) => b.count - a.count),
      byHour,
      bestHour: getBestHour(byHour)
    });
  } catch (error) {
    return next(error);
  }
}
