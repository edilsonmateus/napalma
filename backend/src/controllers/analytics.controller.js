import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageVenue } from "../lib/access.control.js";

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
  "search",
  "artist_profile_view",
  "artist_link_click",
  "artist_booking_click",
  "artist_epk_share",
  "artist_media_click",
  "render_error",
  "unhandled_runtime_error",
  "api_health_unavailable"
]);

const analyticsEventSchema = z.object({
  type: z.string().min(2).max(80),
  visitorId: z.string().max(120).optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  artistId: z.string().uuid().optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  metadata: z.record(z.any()).optional().nullable()
});

const SAFE_METADATA_KEYS = new Set([
  "action", "channel", "provider", "mediaId", "type", "platform",
  "durationMinutes", "enabled", "liveEventsCount", "length", "filterDate", "filterHour",
  "kind", "route", "message", "online", "status"
]);

function sanitizeAnalyticsMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === "boolean") safe[key] = value;
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = Math.max(-1_000_000, Math.min(1_000_000, value));
    if (typeof value === "string") safe[key] = value.trim().slice(0, 120);
  }
  return Object.keys(safe).length ? safe : undefined;
}

function getSinceDate(days = 30) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - safeDays);
  return { safeDays, since };
}

const ANALYTICS_TIER_LEVELS = {
  basic: 1,
  pro: 2,
  premium: 3
};

function normalizeAnalyticsTier(tier) {
  return ANALYTICS_TIER_LEVELS[tier] ? tier : "basic";
}

function resolveAnalyticsEntitlement(venue, isAdmin = false) {
  if (isAdmin) {
    return {
      effectiveTier: "premium",
      source: "admin",
      accessUntil: null,
      canViewBasic: true,
      canViewPro: true,
      canViewPremium: true,
      lockedTiers: { pro: false, premium: false },
      upgradeHints: {}
    };
  }

  const now = new Date();
  const accessUntil = venue?.analyticsAccessUntil ? new Date(venue.analyticsAccessUntil) : null;
  const expired = accessUntil && accessUntil.getTime() < now.getTime();
  const effectiveTier = expired ? "basic" : normalizeAnalyticsTier(venue?.analyticsTier);
  const level = ANALYTICS_TIER_LEVELS[effectiveTier] || 1;

  return {
    effectiveTier,
    source: venue?.analyticsAccessSource || "manual",
    accessUntil: accessUntil ? accessUntil.toISOString() : null,
    canViewBasic: true,
    canViewPro: level >= 2,
    canViewPremium: level >= 3,
    lockedTiers: {
      pro: level < 2,
      premium: level < 3
    },
    upgradeHints: {
      pro: "Impacto Pro libera ranking de eventos, rotas por app, regioes e horarios de interesse.",
      premium: "Impacto Premium libera benchmark seguro, exportacao executiva e comparativos anonimizados."
    }
  };
}

function lockedAnalyticsPayload(tier, title, message) {
  return { locked: true, tier, title, message };
}

const analyticsVenueAccessSelect = {
  id: true,
  name: true,
  createdByUserId: true,
  managerUserId: true,
  analyticsTier: true,
  analyticsAccessSource: true,
  analyticsAccessUntil: true,
  producerAccesses: { select: { producerId: true } },
  managerAccesses: { select: { userId: true } }
};

async function resolveAnalyticsVenueScope(user, requestedVenueId, isAdmin) {
  if (isAdmin) {
    if (!requestedVenueId) return null;
    return prisma.venue.findUnique({
      where: { id: requestedVenueId },
      select: analyticsVenueAccessSelect
    });
  }

  if (!user) return null;

  if (requestedVenueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: requestedVenueId },
      select: analyticsVenueAccessSelect
    });
    return venue && canManageVenue(user, venue) ? venue : null;
  }

  if (user.role === "venue_manager") {
    return prisma.venue.findFirst({
      where: {
        OR: [
          { managerUserId: user.id },
          { managerAccesses: { some: { userId: user.id } } }
        ]
      },
      select: analyticsVenueAccessSelect,
      orderBy: { name: "asc" }
    });
  }

  if (user.role === "producer") {
    return prisma.venue.findFirst({
      where: {
        OR: [
          { createdByUserId: user.id },
          { producerAccesses: { some: { producerId: user.id } } }
        ]
      },
      select: analyticsVenueAccessSelect,
      orderBy: { name: "asc" }
    });
  }

  return null;
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

const BENCHMARK_WEIGHTS = {
  venue_view: 1,
  event_view: 1,
  search: 1,
  region_filter: 1,
  live_filter: 1,
  route_click: 3,
  route_app_click: 4,
  radar_save: 5,
  event_share: 4,
  attendance_yes: 6
};

function getBenchmarkScore(type, count) {
  return (BENCHMARK_WEIGHTS[type] || 0) * count;
}

function anonymizeComparable(index) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Casa comparavel ${letters[index] || index + 1}`;
}

async function buildVenueBenchmark({ since, venueId, isAdmin }) {
  const guardrails = [
    "Concorrentes aparecem anonimizados para evitar exposicao comercial direta.",
    "Benchmark exige amostra minima de 5 casas com sinais de interesse no periodo.",
    "A leitura compara casas da mesma regiao/cidade quando uma casa esta selecionada.",
    "Dados de publicidade paga devem ser interpretados separadamente dos sinais organicos."
  ];

  const selectedVenue = venueId
    ? await prisma.venue.findUnique({
        where: { id: venueId },
        select: { id: true, name: true, region: true, city: true, state: true }
      })
    : null;

  const venueWhere = selectedVenue
    ? {
        city: selectedVenue.city,
        state: selectedVenue.state,
        ...(selectedVenue.region ? { region: selectedVenue.region } : {})
      }
    : {};

  const comparableVenues = await prisma.venue.findMany({
    where: venueWhere,
    select: { id: true, name: true, region: true, city: true, state: true }
  });
  const comparableIds = comparableVenues.map((venue) => venue.id);

  if (!comparableIds.length) {
    return {
      available: false,
      reason: "Ainda nao ha casas comparaveis suficientes para gerar benchmark.",
      guardrails
    };
  }

  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["venueId", "type"],
    where: {
      createdAt: { gte: since },
      venueId: { in: comparableIds }
    },
    _count: { _all: true }
  });

  const scores = new Map(comparableIds.map((id) => [id, { raw: 0, weighted: 0, byType: {} }]));
  grouped.forEach((row) => {
    if (!row.venueId) return;
    const current = scores.get(row.venueId) || { raw: 0, weighted: 0, byType: {} };
    const count = row._count._all;
    current.raw += count;
    current.weighted += getBenchmarkScore(row.type, count);
    current.byType[row.type] = count;
    scores.set(row.venueId, current);
  });

  const ranked = comparableVenues
    .map((venue) => ({
      ...venue,
      rawSignals: scores.get(venue.id)?.raw || 0,
      score: scores.get(venue.id)?.weighted || 0,
      byType: scores.get(venue.id)?.byType || {}
    }))
    .filter((venue) => venue.score > 0 || venue.id === venueId)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const activeSample = ranked.filter((venue) => venue.score > 0);
  const minSample = 5;
  if (activeSample.length < minSample) {
    return {
      available: false,
      reason: `Amostra insuficiente: ${activeSample.length}/${minSample} casas com sinais no periodo.`,
      sampleSize: activeSample.length,
      minSample,
      guardrails
    };
  }

  const totalScore = ranked.reduce((sum, venue) => sum + venue.score, 0);
  const targetIndex = venueId ? ranked.findIndex((venue) => venue.id === venueId) : -1;
  const target = targetIndex >= 0 ? ranked[targetIndex] : ranked[0];
  const position = targetIndex >= 0 ? targetIndex + 1 : 1;
  const percentile = Math.max(1, Math.round((1 - (position - 1) / ranked.length) * 100));
  let comparableCounter = 0;

  return {
    available: true,
    scope: selectedVenue
      ? `${selectedVenue.region || "Regiao"} - ${selectedVenue.city || "Cidade"}`
      : "Plataforma",
    sampleSize: activeSample.length,
    minSample,
    position,
    totalComparable: ranked.length,
    percentile,
    score: target?.score || 0,
    share: totalScore ? Number((((target?.score || 0) / totalScore) * 100).toFixed(1)) : 0,
    ownVenue: selectedVenue ? selectedVenue.name : target?.name || "Casa em destaque",
    leaders: ranked.slice(0, 6).map((venue) => {
      const isSelf = venueId ? venue.id === venueId : false;
      const label = isSelf
        ? venue.name
        : isAdmin && !venueId
          ? venue.name
          : anonymizeComparable(comparableCounter++);
      return {
        label,
        isSelf,
        score: venue.score,
        rawSignals: venue.rawSignals,
        share: totalScore ? Number(((venue.score / totalScore) * 100).toFixed(1)) : 0
      };
    }),
    guardrails
  };
}

export async function trackAnalyticsEvent(req, res, next) {
  try {
    const payload = analyticsEventSchema.parse(req.body);
    if (!TRACKABLE_EVENT_TYPES.has(payload.type)) {
      return res.status(400).json({ message: "Tipo de evento de analytics invalido." });
    }

    const visitorId = payload.visitorId || null;
    // Client payloads must never be able to attribute analytics to another account.
    const userId = req.user?.id || null;

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
        metadata: sanitizeAnalyticsMetadata(payload.metadata),
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
    const requestedVenueId = req.query.venueId ? String(req.query.venueId) : null;
    const isAdmin = req.user?.role === "admin";
    const selectedVenueForAccess = await resolveAnalyticsVenueScope(req.user, requestedVenueId, isAdmin);

    if (!isAdmin && !selectedVenueForAccess) {
      return res.status(403).json({ message: "Voce nao tem permissao para visualizar o Impacto 77Gira desta casa." });
    }

    const venueId = selectedVenueForAccess?.id || null;
    const entitlement = resolveAnalyticsEntitlement(selectedVenueForAccess, isAdmin);
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

    const canViewPro = entitlement.canViewPro;
    const canViewPremium = entitlement.canViewPremium;
    const benchmark = canViewPremium
      ? await buildVenueBenchmark({
          since,
          venueId,
          isAdmin
        })
      : {
          available: false,
          locked: true,
          reason: "Benchmark comparativo disponivel no Impacto Premium.",
          guardrails: []
        };

    return res.json({
      days: safeDays,
      generatedAt: new Date().toISOString(),
      entitlement,
      locks: {
        pro: canViewPro
          ? null
          : lockedAnalyticsPayload(
              "pro",
              "Impacto Pro",
              "Ranking de eventos, rotas por app, regioes e horarios ficam bloqueados neste plano."
            ),
        premium: canViewPremium
          ? null
          : lockedAnalyticsPayload(
              "premium",
              "Impacto Premium",
              "Benchmark comparativo e relatorio executivo ficam bloqueados neste plano."
            )
      },
      metrics,
      totals,
      topEvents: canViewPro ? sortedTopEvents : [],
      topEventsDetailed: canViewPro ? sortedTopEvents.map((item) => {
        const event = eventById.get(item.eventId);
        return {
          eventId: item.eventId,
          title: event?.title || "Evento sem nome",
          venue: event?.venue?.name || "",
          count: item._count._all
        };
      }) : [],
      topRegions: canViewPro ? topRegions.sort((a, b) => b._count._all - a._count._all).slice(0, 8) : [],
      topRegionsDetailed: canViewPro ? topRegions
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 8)
        .map((item) => ({ region: item.region, count: item._count._all })) : [],
      routeProviders: canViewPro ? Object.entries(routeProvidersMap)
        .map(([provider, count]) => ({ provider, count }))
        .sort((a, b) => b.count - a.count) : [],
      byHour: canViewPro ? byHour : {},
      bestHour: canViewPro ? getBestHour(byHour) : null,
      benchmark
    });
  } catch (error) {
    return next(error);
  }
}
