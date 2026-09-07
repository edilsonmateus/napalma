import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageVenue } from "../lib/access.control.js";
import {
  canTransitionVenueVisibility,
  initialVenueVisibilityFor,
  isVenuePubliclyEligible,
  publicVenueWhere,
  VENUE_CREATION_ORIGIN
} from "../services/venueVisibility.service.js";
import { hasVenueAdminOnlyFields } from "../policies/venueFields.policy.js";
import { attachVenueImageAsset } from "../services/venueImageAssets.service.js";
import { recordAuditEvent } from "../services/audit.service.js";

const querySchema = z.object({
  region: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  scope: z.enum(["managed", "public"]).optional()
});

const operationsVenuesSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const optionalAnalyticsAccessSource = z.preprocess(
  (value) => value === "" ? null : value,
  z.enum(["manual", "gateway", "trial"]).optional().nullable()
);

const optionalDateText = z.preprocess(
  (value) => value === "" ? null : value,
  z.string().optional().nullable()
);

const optionalCoordinate = (min, max) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? null : Number(value),
  z.number().min(min).max(max).optional().nullable()
);

const createVenueSchema = z.object({
  name: z.string().trim().min(3),
  goldPartner: z.boolean().optional().default(false),
  analyticsTier: z.enum(["basic", "pro", "premium"]).optional().default("basic"),
  analyticsAccessSource: optionalAnalyticsAccessSource,
  analyticsAccessUntil: optionalDateText,
  description: z.string().trim().min(3).optional(),
  contactName: z.string().trim().min(2).optional(),
  contactPhone: z.string().trim().min(8).optional(),
  instagramUrl: z.string().url().optional(),
  address: z.string().trim().min(5),
  latitude: optionalCoordinate(-90, 90),
  longitude: optionalCoordinate(-180, 180),
  neighborhood: z.string().trim().min(2),
  nickname: z.string().trim().max(120).optional(),
  grammarArticle: z.enum(["", "o", "a", "os", "as"]).optional(),
  grammarPreposition: z.enum(["em", "no", "na"]).optional(),
  displayNameWithArticle: z.string().trim().max(120).optional(),
  displayNameWithPreposition: z.string().trim().max(120).optional(),
  nicknameGrammarArticle: z.enum(["", "o", "a", "os", "as"]).optional(),
  nicknameGrammarPreposition: z.enum(["em", "no", "na"]).optional(),
  nicknameDisplayNameWithArticle: z.string().trim().max(120).optional(),
  nicknameDisplayNameWithPreposition: z.string().trim().max(120).optional(),
  neighborhoodGrammarArticle: z.enum(["", "o", "a", "os", "as"]).optional(),
  neighborhoodGrammarPreposition: z.enum(["em", "no", "na"]).optional(),
  neighborhoodDisplayNameWithArticle: z.string().trim().max(120).optional(),
  neighborhoodDisplayNameWithPreposition: z.string().trim().max(120).optional(),
  region: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().length(2),
  imageUrl: z.string().url().optional(),
  venueImageAssetId: z.string().uuid().optional(),
  openDays: z.array(z.string().trim().min(2)).default([])
});

const updateVenueSchema = createVenueSchema.partial();

const idSchema = z.object({
  id: z.string().uuid()
});

const visibilityStatusSchema = z.enum(["draft", "published", "paused"]);
const visibilityReasonCodeSchema = z.enum([
  "venue_request",
  "temporary_closure",
  "catalog_review",
  "schedule_issue",
  "operational_other"
]);
const visibilityUpdateSchema = z.object({
  status: z.enum(["published", "paused"]),
  reasonCode: visibilityReasonCodeSchema.optional(),
  expectedStatus: visibilityStatusSchema
}).superRefine((value, context) => {
  if (value.status === "paused" && !value.reasonCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["reasonCode"], message: "Informe o motivo da pausa." });
  }
});

const venueDeletionSchema = z.object({
  confirmationName: z.string().trim().min(3).max(160)
});

const producerLinkSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional()
}).refine((data) => data.userId || data.email, {
  message: "Informe userId ou email para vincular produtor."
});

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildArticlePreview(article, name) {
  const cleanName = String(name || "").trim();
  const cleanArticle = String(article || "").trim();
  return cleanArticle ? `${cleanArticle} ${cleanName}`.trim() : cleanName;
}

function buildPrepositionPreview(preposition, name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "";
  const cleanPreposition = String(preposition || "em").trim();
  return `${cleanPreposition} ${cleanName}`.trim();
}

function buildVenueGrammarData(data) {
  const venueName = data.name || "";
  const venueNickname = data.nickname || "";
  const neighborhoodName = data.neighborhood || "";
  return {
    ...(data.nickname !== undefined ? { nickname: data.nickname || null } : {}),
    ...(data.grammarArticle !== undefined ? { grammarArticle: data.grammarArticle || null } : {}),
    ...(data.grammarPreposition !== undefined ? { grammarPreposition: data.grammarPreposition || "em" } : {}),
    ...(data.displayNameWithArticle !== undefined
      ? { displayNameWithArticle: data.displayNameWithArticle || buildArticlePreview(data.grammarArticle, venueName) }
      : {}),
    ...(data.displayNameWithPreposition !== undefined
      ? { displayNameWithPreposition: data.displayNameWithPreposition || buildPrepositionPreview(data.grammarPreposition, venueName) }
      : {}),
    ...(data.nicknameGrammarArticle !== undefined ? { nicknameGrammarArticle: data.nicknameGrammarArticle || null } : {}),
    ...(data.nicknameGrammarPreposition !== undefined ? { nicknameGrammarPreposition: data.nicknameGrammarPreposition || "em" } : {}),
    ...(data.nicknameDisplayNameWithArticle !== undefined
      ? {
          nicknameDisplayNameWithArticle:
            data.nicknameDisplayNameWithArticle || buildArticlePreview(data.nicknameGrammarArticle, venueNickname)
        }
      : {}),
    ...(data.nicknameDisplayNameWithPreposition !== undefined
      ? {
          nicknameDisplayNameWithPreposition:
            data.nicknameDisplayNameWithPreposition || buildPrepositionPreview(data.nicknameGrammarPreposition, venueNickname)
        }
      : {}),
    ...(data.neighborhoodGrammarArticle !== undefined
      ? { neighborhoodGrammarArticle: data.neighborhoodGrammarArticle || null }
      : {}),
    ...(data.neighborhoodGrammarPreposition !== undefined
      ? { neighborhoodGrammarPreposition: data.neighborhoodGrammarPreposition || "em" }
      : {}),
    ...(data.neighborhoodDisplayNameWithArticle !== undefined
      ? {
          neighborhoodDisplayNameWithArticle:
            data.neighborhoodDisplayNameWithArticle || buildArticlePreview(data.neighborhoodGrammarArticle, neighborhoodName)
        }
      : {}),
    ...(data.neighborhoodDisplayNameWithPreposition !== undefined
      ? {
          neighborhoodDisplayNameWithPreposition:
            data.neighborhoodDisplayNameWithPreposition || buildPrepositionPreview(data.neighborhoodGrammarPreposition, neighborhoodName)
        }
      : {})
  };
}

function normalizeAnalyticsAccessUntil(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T23:59:59.000Z`) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildVenueAnalyticsData(data) {
  return {
    ...(data.analyticsTier !== undefined ? { analyticsTier: data.analyticsTier || "basic" } : {}),
    ...(data.analyticsAccessSource !== undefined ? { analyticsAccessSource: data.analyticsAccessSource || null } : {}),
    ...(data.analyticsAccessUntil !== undefined
      ? { analyticsAccessUntil: normalizeAnalyticsAccessUntil(data.analyticsAccessUntil) }
      : {})
  };
}

function mapVenuePayload(venue) {
  const venueArticlePreview = buildArticlePreview(venue.grammarArticle, venue.name);
  const venuePrepositionPreview = buildPrepositionPreview(venue.grammarPreposition, venue.name);
  const nicknameArticlePreview = buildArticlePreview(venue.nicknameGrammarArticle, venue.nickname);
  const nicknamePrepositionPreview = buildPrepositionPreview(venue.nicknameGrammarPreposition, venue.nickname);
  const neighborhoodArticlePreview = buildArticlePreview(venue.neighborhoodGrammarArticle, venue.neighborhood);
  const neighborhoodPrepositionPreview = buildPrepositionPreview(venue.neighborhoodGrammarPreposition, venue.neighborhood);
  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    goldPartner: Boolean(venue.goldPartner),
    analyticsTier: venue.analyticsTier || "basic",
    analyticsAccessSource: venue.analyticsAccessSource || "",
    analyticsAccessUntil: venue.analyticsAccessUntil ? venue.analyticsAccessUntil.toISOString() : "",
    description: venue.description,
    contactName: venue.contactName ?? "",
    contactPhone: venue.contactPhone ?? "",
    instagramUrl: venue.instagramUrl ?? "",
    address: venue.address,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    neighborhood: venue.neighborhood,
    nickname: venue.nickname ?? "",
    grammarArticle: venue.grammarArticle ?? "",
    grammarPreposition: venue.grammarPreposition ?? "em",
    displayNameWithArticle: venue.displayNameWithArticle || venueArticlePreview,
    displayNameWithPreposition: venue.displayNameWithPreposition || venuePrepositionPreview,
    nicknameGrammarArticle: venue.nicknameGrammarArticle ?? "",
    nicknameGrammarPreposition: venue.nicknameGrammarPreposition ?? "em",
    nicknameDisplayNameWithArticle: venue.nicknameDisplayNameWithArticle || nicknameArticlePreview,
    nicknameDisplayNameWithPreposition: venue.nicknameDisplayNameWithPreposition || nicknamePrepositionPreview,
    neighborhoodGrammarArticle: venue.neighborhoodGrammarArticle ?? "",
    neighborhoodGrammarPreposition: venue.neighborhoodGrammarPreposition ?? "em",
    neighborhoodDisplayNameWithArticle: venue.neighborhoodDisplayNameWithArticle || neighborhoodArticlePreview,
    neighborhoodDisplayNameWithPreposition: venue.neighborhoodDisplayNameWithPreposition || neighborhoodPrepositionPreview,
    region: venue.region,
    city: venue.city,
    state: venue.state,
    imageUrl: venue.imageUrl,
    bannerImageUrl: venue.bannerImageUrl || "",
    bannerImageMediumUrl: venue.bannerImageMediumUrl || "",
    bannerImageSmallUrl: venue.bannerImageSmallUrl || "",
    thumbnailImageUrl: venue.thumbnailImageUrl || "",
    thumbnailImageSmallUrl: venue.thumbnailImageSmallUrl || "",
    images: {
      legacy: venue.imageUrl || "",
      banner: venue.bannerImageUrl || venue.imageUrl || "",
      bannerMedium: venue.bannerImageMediumUrl || venue.bannerImageUrl || venue.imageUrl || "",
      bannerSmall: venue.bannerImageSmallUrl || venue.bannerImageMediumUrl || venue.bannerImageUrl || venue.imageUrl || "",
      thumbnail: venue.thumbnailImageUrl || venue.imageUrl || "",
      thumbnailSmall: venue.thumbnailImageSmallUrl || venue.thumbnailImageUrl || venue.imageUrl || ""
    },
    openDays: venue.openDays ?? [],
    visibilityStatus: venue.visibilityStatus,
    eventsCount: venue._count?.events ?? 0,
    hasPublishedMenu: venue.menu?.status === "published"
  };
}

function mapPublicVenuePayload(venue) {
  const {
    analyticsTier,
    analyticsAccessSource,
    analyticsAccessUntil,
    contactName,
    contactPhone,
    visibilityStatus,
    ...publicPayload
  } = mapVenuePayload(venue);
  return publicPayload;
}

function canReadManagedVenue(user, venue) {
  return ["admin", "producer", "venue_manager"].includes(user?.role) && canManageVenue(user, venue);
}

function mapVenueVisibility(venue) {
  return {
    status: venue.visibilityStatus,
    changedAt: venue.visibilityChangedAt || null
  };
}

function compactPerson(person) {
  if (!person) return null;
  return {
    id: person.id,
    name: [person.firstName, person.lastName].filter(Boolean).join(" ") || null,
    email: person.email || null
  };
}

async function getVenueVisibilityImpact(client, venueId, now = new Date()) {
  const [eventsNow, futureConfirmed, futureDraft, recurring, pendingReminders, radarMarks, menu, pendingDeliveries] = await Promise.all([
    client.event.count({ where: { venueId, startDate: { lte: now }, endDate: { gte: now } } }),
    client.event.count({ where: { venueId, status: "confirmed", startDate: { gt: now } } }),
    client.event.count({ where: { venueId, status: "draft", startDate: { gt: now } } }),
    client.event.count({ where: { venueId, isRecurring: true } }),
    client.eventReminder.count({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        event: { venueId, startDate: { gt: now } }
      }
    }),
    client.markedEvent.count({ where: { event: { venueId, startDate: { gt: now } } } }),
    client.venueMenu.findUnique({ where: { venueId }, select: { status: true } }),
    client.adDelivery.count({ where: { venueId, expiresAt: { gt: now }, impressionRecordedAt: null } })
  ]);

  return {
    eventsNow,
    futureConfirmed,
    futureDraft,
    recurring,
    pendingReminders,
    activeRadarMarks: radarMarks,
    menuStatus: menu?.status || "not_configured",
    pendingAdDeliveries: pendingDeliveries
  };
}

function mapAdminVenueOverview(venue, impact, lastVisibilityChange) {
  const nextEvent = venue.events[0] || null;
  const statusCounts = Object.fromEntries((venue.eventStatusCounts || []).map((entry) => [entry.status, entry._count._all]));
  const activeManagers = venue.managerAccesses.map((entry) => compactPerson(entry.user)).filter(Boolean);
  const activeProducers = venue.producerAccesses.map((entry) => compactPerson(entry.producer)).filter(Boolean);
  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    visibility: mapVenueVisibility(venue),
    presentation: {
      nickname: venue.nickname || "",
      description: venue.description || "",
      imageUrl: venue.imageUrl || "",
      bannerImageUrl: venue.bannerImageUrl || venue.imageUrl || "",
      thumbnailImageUrl: venue.thumbnailImageUrl || venue.imageUrl || "",
      thumbnailImageSmallUrl: venue.thumbnailImageSmallUrl || venue.thumbnailImageUrl || venue.imageUrl || "",
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      neighborhood: venue.neighborhood,
      region: venue.region,
      city: venue.city,
      state: venue.state,
      openDays: venue.openDays || [],
      instagramUrl: venue.instagramUrl || "",
      grammarArticle: venue.grammarArticle || "",
      grammarPreposition: venue.grammarPreposition || "em",
      displayNameWithArticle: venue.displayNameWithArticle || venue.name,
      displayNameWithPreposition: venue.displayNameWithPreposition || `em ${venue.name}`
    },
    operation: {
      contactName: venue.contactName || "",
      contactPhone: venue.contactPhone || "",
      createdBy: compactPerson(venue.createdBy),
      managers: activeManagers,
      producers: activeProducers,
      accessCount: activeManagers.length + activeProducers.length,
      acquisitionLeadId: venue.acquisitionLead?.id || null,
      claims: venue.claimRequests.map((claim) => ({ id: claim.id, status: claim.status, createdAt: claim.createdAt }))
    },
    programming: {
      totalEvents: venue._count.events,
      futureEvents: impact.futureConfirmed + impact.futureDraft,
      confirmedEvents: statusCounts.confirmed || 0,
      draftEvents: statusCounts.draft || 0,
      nextEvent,
      upcomingEvents: venue.events
    },
    menu: venue.menu ? {
      status: venue.menu.status,
      reviewedAt: venue.menu.reviewedAt || null,
      publishedAt: venue.menu.publishedAt || null,
      updatedAt: venue.menu.updatedAt
    } : null,
    analytics: {
      tier: venue.analyticsTier || "basic",
      accessSource: venue.analyticsAccessSource || null,
      accessUntil: venue.analyticsAccessUntil || null
    },
    impact,
    lastVisibilityChange: lastVisibilityChange ? {
      changedAt: lastVisibilityChange.createdAt,
      actor: compactPerson(lastVisibilityChange.actor),
      reasonCode: lastVisibilityChange.metadata?.reasonCode || null,
      fromStatus: lastVisibilityChange.metadata?.fromStatus || null,
      toStatus: lastVisibilityChange.metadata?.toStatus || null
    } : null
  };
}

function mapVenueDeletionImpact(venue) {
  const dependencies = {
    events: venue._count.events,
    producerAccesses: venue._count.producerAccesses,
    managerAccesses: venue._count.managerAccesses,
    claimRequests: venue._count.claimRequests,
    adEvents: venue._count.adEvents,
    menu: venue.menu ? 1 : 0,
    acquisitionLead: venue.acquisitionLead ? 1 : 0
  };
  const totalDependencies = Object.values(dependencies).reduce((total, count) => total + count, 0);
  return {
    venue: { id: venue.id, name: venue.name },
    dependencies,
    totalDependencies,
    canDelete: totalDependencies === 0
  };
}

const venueDeletionImpactSelect = {
  id: true,
  name: true,
  menu: { select: { id: true } },
  acquisitionLead: { select: { id: true } },
  _count: {
    select: {
      events: true,
      producerAccesses: true,
      managerAccesses: true,
      claimRequests: true,
      adEvents: true
    }
  }
};

export async function getAdminVenueOverview(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const now = new Date();
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        managerAccesses: { select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        producerAccesses: { select: { producer: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        claimRequests: { select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
        acquisitionLead: { select: { id: true } },
        menu: { select: { status: true, reviewedAt: true, publishedAt: true, updatedAt: true } },
        events: {
          where: { startDate: { gte: now } },
          select: { id: true, title: true, startDate: true, endDate: true, status: true, isRecurring: true },
          orderBy: { startDate: "asc" },
          take: 6
        },
        _count: { select: { events: true } }
      }
    });
    if (!venue) return res.status(404).json({ error: "venue_not_found", message: "Casa de samba nao encontrada." });
    const [eventStatusCounts, impact, lastVisibilityChange] = await Promise.all([
      prisma.event.groupBy({ by: ["status"], where: { venueId: id }, _count: { _all: true } }),
      getVenueVisibilityImpact(prisma, id, now),
      prisma.auditLog.findFirst({
        where: { subjectType: "venue", subjectId: id, action: "venue.visibility_changed" },
        select: {
          createdAt: true,
          metadata: true,
          actor: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
    return res.json({ item: mapAdminVenueOverview({ ...venue, eventStatusCounts }, impact, lastVisibilityChange) });
  } catch (error) {
    next(error);
  }
}

export async function getAdminVenueVisibilityImpact(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const venue = await prisma.venue.findUnique({ where: { id }, select: { id: true, name: true, visibilityStatus: true } });
    if (!venue) return res.status(404).json({ error: "venue_not_found", message: "Casa de samba nao encontrada." });
    return res.json({ item: { venue: { id: venue.id, name: venue.name, status: venue.visibilityStatus }, impact: await getVenueVisibilityImpact(prisma, id) } });
  } catch (error) {
    next(error);
  }
}

export async function getAdminVenueDeletionImpact(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const venue = await prisma.venue.findUnique({ where: { id }, select: venueDeletionImpactSelect });
    if (!venue) return res.status(404).json({ error: "venue_not_found", message: "Casa de samba nao encontrada." });
    return res.json({ item: mapVenueDeletionImpact(venue) });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminVenueVisibility(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const payload = visibilityUpdateSchema.parse(req.body);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const venue = await tx.venue.findUnique({ where: { id }, select: { id: true, name: true, visibilityStatus: true, visibilityChangedAt: true } });
      if (!venue) return { status: 404, error: "venue_not_found" };
      if (venue.visibilityStatus !== payload.expectedStatus) {
        return { status: 409, error: "visibility_state_changed", currentStatus: venue.visibilityStatus };
      }
      if (venue.visibilityStatus === payload.status) {
        return { status: 200, item: { id: venue.id, name: venue.name, visibility: { status: venue.visibilityStatus, changedAt: null }, changed: false, cancelledReminders: 0 } };
      }
      if (!canTransitionVenueVisibility(venue.visibilityStatus, payload.status)) {
        return { status: 409, error: "invalid_visibility_transition", currentStatus: venue.visibilityStatus };
      }

      const impact = await getVenueVisibilityImpact(tx, id, now);
      const updated = await tx.venue.update({
        where: { id },
        data: { visibilityStatus: payload.status, visibilityChangedAt: now },
        select: { id: true, name: true, visibilityStatus: true, visibilityChangedAt: true }
      });
      const cancelled = payload.status === "paused"
        ? await tx.eventReminder.updateMany({
          where: {
            status: { in: ["PENDING", "PROCESSING"] },
            event: { venueId: id, startDate: { gt: now } }
          },
          data: { status: "CANCELLED", cancelledAt: now, failureReason: "venue_visibility_paused" }
        })
        : { count: 0 };
      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "venue.visibility_changed",
          subjectType: "venue",
          subjectId: id,
          metadata: {
            fromStatus: venue.visibilityStatus,
            toStatus: payload.status,
            reasonCode: payload.reasonCode || null,
            cancelledReminders: cancelled.count
          }
        }
      });
      return {
        status: 200,
        item: {
          id: updated.id,
          name: updated.name,
          visibility: mapVenueVisibility(updated),
          changed: true,
          cancelledReminders: cancelled.count,
          impact
        }
      };
    });

    if (result.status === 404) return res.status(404).json({ error: result.error, message: "Casa de samba nao encontrada." });
    if (result.status === 409) return res.status(409).json({ error: result.error, currentStatus: result.currentStatus });
    return res.json({ item: result.item });
  } catch (error) {
    next(error);
  }
}

export async function getVenueById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        },
        _count: {
          select: { events: true }
        },
        menu: { select: { status: true } }
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    const canReadManaged = canReadManagedVenue(req.user, venue);
    if ((req.user?.role === "producer" || req.user?.role === "venue_manager") && !canReadManaged) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode acessar esta casa."
      });
    }

    if (!canReadManaged && !isVenuePubliclyEligible(venue)) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    res.json({ item: canReadManaged ? mapVenuePayload(venue) : mapPublicVenuePayload(venue) });
  } catch (error) {
    next(error);
  }
}

export async function listVenues(req, res, next) {
  try {
    const { region, q, scope } = querySchema.parse(req.query);
    const isVenueManager = req.user?.role === "venue_manager";
    const isProducer = req.user?.role === "producer";
    const filters = [];
    const canUseManagedScope = ["admin", "producer", "venue_manager"].includes(req.user?.role);
    const useManagedScope = canUseManagedScope && scope !== "public";

    if (isProducer && useManagedScope) {
      filters.push({
        OR: [
          { createdByUserId: req.user.id },
          { producerAccesses: { some: { producerId: req.user.id } } }
        ]
      });
    }

    if (isVenueManager && useManagedScope) {
      filters.push({
        OR: [
          { managerUserId: req.user.id },
          { managerAccesses: { some: { userId: req.user.id } } }
        ]
      });
    }

    if (region) {
      filters.push({ region });
    }

    if (q) {
      filters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { neighborhood: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    if (!useManagedScope) {
      filters.push(publicVenueWhere());
    }

    const items = await prisma.venue.findMany({
      where: filters.length ? { AND: filters } : undefined,
      include: {
        menu: { select: { status: true } },
        _count: {
          select: { events: true }
        }
      },
      orderBy: [{ region: "asc" }, { name: "asc" }]
    });

    res.json({ items: items.map(useManagedScope ? mapVenuePayload : mapPublicVenuePayload) });
  } catch (error) {
    next(error);
  }
}

/**
 * Internal operations view. This intentionally exposes only the information
 * needed to triage public catalogue quality; contacts remain behind the
 * regular venue-management screens.
 */
export async function listOperationsVenues(req, res, next) {
  try {
    const { query, limit } = operationsVenuesSchema.parse(req.query || {});
    const now = new Date();
    const where = query ? {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { neighborhood: { contains: query, mode: "insensitive" } },
        { region: { contains: query, mode: "insensitive" } }
      ]
    } : undefined;
    const venues = await prisma.venue.findMany({
      where,
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        neighborhood: true,
        region: true,
        imageUrl: true,
        bannerImageUrl: true,
        thumbnailImageUrl: true,
        updatedAt: true,
        menu: { select: { status: true } },
        events: {
          where: { startDate: { gte: now } },
          orderBy: { startDate: "asc" },
          take: 1,
          select: { id: true, title: true, startDate: true, status: true }
        },
        _count: { select: { events: true, managerAccesses: true, producerAccesses: true } }
      }
    });
    res.json({
      items: venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        location: [venue.neighborhood, venue.city, venue.state].filter(Boolean).join(" · "),
        region: venue.region,
        hasImage: Boolean(venue.bannerImageUrl || venue.thumbnailImageUrl || venue.imageUrl),
        menuStatus: venue.menu?.status || "not_configured",
        totalEvents: venue._count.events,
        accessCount: venue._count.managerAccesses + venue._count.producerAccesses,
        nextEvent: venue.events[0] || null,
        updatedAt: venue.updatedAt,
        attention: !(venue.bannerImageUrl || venue.thumbnailImageUrl || venue.imageUrl) || !venue.events.length || !venue.menu || venue.menu.status !== "published"
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function createVenue(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "forbidden",
        message: "Somente admin pode cadastrar novas casas. Use o fluxo de reivindicacao."
      });
    }
    const data = createVenueSchema.parse(req.body);
    const { venueImageAssetId, ...venueData } = data;
    const baseSlug = slugify(data.name);

    const existing = await prisma.venue.findFirst({
      where: {
        OR: [{ slug: baseSlug }, { name: data.name }]
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({
        error: "venue_already_exists",
        message: "Ja existe uma casa com esse nome."
      });
    }

    const venue = await prisma.$transaction(async (tx) => {
      const created = await tx.venue.create({
        data: {
          ...venueData,
          ...buildVenueGrammarData(venueData),
          ...buildVenueAnalyticsData(venueData),
          slug: baseSlug,
          visibilityStatus: initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.ADMIN_MANUAL),
          createdByUserId: req.user.id
        }
      });
      if (venueImageAssetId) {
        await attachVenueImageAsset({ tx, assetId: venueImageAssetId, venueId: created.id, ownerUserId: req.user.id });
      }
      return tx.venue.findUnique({
        where: { id: created.id },
        include: { _count: { select: { events: true } } }
      });
    });

    if (venueImageAssetId) {
      await recordAuditEvent({ req, action: "venue.image_attached", subjectType: "venue", subjectId: venue.id, metadata: { source: "admin_create" } });
    }

    res.status(201).json({ item: mapVenuePayload(venue) });
  } catch (error) {
    if (error?.publicMessage) return res.status(error.status || 400).json({ error: error.code, message: error.publicMessage });
    next(error);
  }
}

export async function updateVenue(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    if (req.user?.role !== "admin" && hasVenueAdminOnlyFields(req.body)) {
      return res.status(403).json({
        error: "gold_partner_admin_only",
        message: "Somente administradores da 77Gira podem alterar a condição Gold Partner."
      });
    }
    const data = updateVenueSchema.parse(req.body);
    const { venueImageAssetId, ...venueData } = data;

    const existing = await prisma.venue.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, existing)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode editar esta casa."
      });
    }
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "admin_approval_required",
        message: "Edicoes de casa por este perfil exigem aprovacao do admin."
      });
    }

    if (venueData.name) {
      const duplicate = await prisma.venue.findFirst({
        where: {
          id: { not: id },
          OR: [{ name: venueData.name }, { slug: slugify(venueData.name) }]
        },
        select: { id: true }
      });
      if (duplicate) {
        return res.status(409).json({
          error: "venue_already_exists",
          message: "Ja existe outra casa com esse nome."
        });
      }
    }

    const venue = await prisma.$transaction(async (tx) => {
      const { analyticsTier, analyticsAccessSource, analyticsAccessUntil, ...safeData } = venueData;
      await tx.venue.update({
        where: { id },
        data: {
          ...safeData,
          ...buildVenueGrammarData(safeData),
          ...buildVenueAnalyticsData({ analyticsTier, analyticsAccessSource, analyticsAccessUntil }),
          ...(venueData.name ? { slug: slugify(venueData.name) } : {})
        }
      });
      if (venueImageAssetId) {
        await attachVenueImageAsset({ tx, assetId: venueImageAssetId, venueId: id, ownerUserId: req.user.id });
      }
      return tx.venue.findUnique({
        where: { id },
        include: { _count: { select: { events: true } } }
      });
    });

    if (venueImageAssetId) {
      await recordAuditEvent({ req, action: "venue.image_attached", subjectType: "venue", subjectId: venue.id, metadata: { source: "admin_update" } });
    }

    res.json({ item: mapVenuePayload(venue) });
  } catch (error) {
    if (error?.publicMessage) return res.status(error.status || 400).json({ error: error.code, message: error.publicMessage });
    next(error);
  }
}

export async function deleteVenue(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const existing = await prisma.venue.findUnique({
      where: { id },
      include: {
        _count: {
          select: { events: true }
        },
        createdBy: { select: { id: true } },
        manager: { select: { id: true } },
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, existing)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode excluir esta casa."
      });
    }
    if (req.user?.role === "admin") {
      return res.status(403).json({
        error: "admin_deletion_confirmation_required",
        message: "Use a confirmacao reforcada na ficha administrativa para excluir uma casa."
      });
    }
    if (req.user?.role === "producer") {
      await prisma.producerVenueAccess.deleteMany({
        where: {
          producerId: req.user.id,
          venueId: id
        }
      });
      return res.status(204).send();
    }
    if (req.user?.role === "venue_manager") {
      return res.status(403).json({
        error: "forbidden",
        message: "Perfil casa nao pode excluir casa da plataforma."
      });
    }

    if (existing._count.events > 0) {
      return res.status(409).json({
        error: "venue_has_events",
        message: "Nao e possivel excluir uma casa com eventos vinculados."
      });
    }

    await prisma.venue.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminVenue(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { confirmationName } = venueDeletionSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const venue = await tx.venue.findUnique({ where: { id }, select: venueDeletionImpactSelect });
      if (!venue) return { status: 404, error: "venue_not_found" };
      if (confirmationName !== venue.name) return { status: 400, error: "venue_name_confirmation_mismatch" };

      const impact = mapVenueDeletionImpact(venue);
      if (!impact.canDelete) return { status: 409, error: "venue_has_dependencies", impact };

      await tx.auditLog.create({
        data: {
          actorUserId: req.user.id,
          action: "venue.deleted",
          subjectType: "venue",
          subjectId: venue.id,
          metadata: { confirmation: "exact_name", totalDependencies: 0 }
        }
      });
      await tx.venue.delete({ where: { id: venue.id } });
      return { status: 204 };
    });

    if (result.status === 404) return res.status(404).json({ error: result.error, message: "Casa de samba nao encontrada." });
    if (result.status === 400) return res.status(400).json({ error: result.error, message: "Digite exatamente o nome da casa para confirmar." });
    if (result.status === 409) return res.status(409).json({
      error: result.error,
      message: "A casa possui vínculos e não pode ser excluída.",
      item: result.impact
    });
    return res.status(204).send();
  } catch (error) {
    if (error?.code === "P2003") {
      return res.status(409).json({
        error: "venue_has_dependencies",
        message: "Um vínculo foi criado enquanto a exclusão era confirmada. Revise a ficha antes de tentar novamente."
      });
    }
    next(error);
  }
}

export async function listVenueProducers(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        producerAccesses: {
          include: {
            producer: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        },
        managerAccesses: {
          select: { userId: true }
        }
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, venue)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode gerenciar produtores desta casa."
      });
    }

    const items = venue.producerAccesses.map((entry) => ({
      id: entry.id,
      user: entry.producer,
      createdAt: entry.createdAt
    }));

    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addVenueProducer(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const data = producerLinkSchema.parse(req.body);

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        },
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, venue)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode gerenciar produtores desta casa."
      });
    }

    const producerUser = data.userId
      ? await prisma.user.findUnique({ where: { id: data.userId } })
      : await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

    if (!producerUser) {
      return res.status(404).json({
        error: "user_not_found",
        message: "Usuario nao encontrado."
      });
    }

    if (producerUser.role !== "producer") {
      return res.status(409).json({
        error: "invalid_role",
        message: "Somente usuarios com role producer podem ser vinculados."
      });
    }

    const existing = await prisma.producerVenueAccess.findFirst({
      where: { venueId: id, producerId: producerUser.id },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({
        error: "producer_already_linked",
        message: "Produtor ja vinculado a esta casa."
      });
    }

    const link = await prisma.producerVenueAccess.create({
      data: {
        venueId: id,
        producerId: producerUser.id
      },
      include: {
        producer: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      item: {
        id: link.id,
        user: link.producer,
        createdAt: link.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function removeVenueProducer(req, res, next) {
  try {
    const venueId = z.string().uuid().parse(req.params.id);
    const userId = z.string().uuid().parse(req.params.userId);

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        },
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, venue)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode gerenciar produtores desta casa."
      });
    }

    const existing = await prisma.producerVenueAccess.findFirst({
      where: { venueId, producerId: userId },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({
        error: "producer_link_not_found",
        message: "Vinculo de produtor nao encontrado."
      });
    }

    await prisma.producerVenueAccess.delete({
      where: { id: existing.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function removeVenueManager(req, res, next) {
  try {
    const venueId = z.string().uuid().parse(req.params.id);
    const userId = z.string().uuid().parse(req.params.userId);

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
        }
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (!canManageVenue(req.user, venue)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode gerenciar gestores desta casa."
      });
    }

    const existing = await prisma.venueManagerAccess.findFirst({
      where: { venueId, userId },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({
        error: "manager_link_not_found",
        message: "Vinculo de gestor nao encontrado."
      });
    }

    await prisma.venueManagerAccess.delete({
      where: { id: existing.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function revokeMyVenueAccess(req, res, next) {
  try {
    const venueId = z.string().uuid().parse(req.params.id);

    const existing = await prisma.venueManagerAccess.findFirst({
      where: {
        venueId,
        userId: req.user.id
      },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({
        error: "manager_link_not_found",
        message: "Seu acesso a esta filial ja foi removido."
      });
    }

    await prisma.venueManagerAccess.delete({
      where: { id: existing.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export const listVenueManagers = listVenueProducers;
export const addVenueManager = addVenueProducer;
