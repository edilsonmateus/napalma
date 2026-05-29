import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const trackVisitSchema = z.object({
  visitorId: z.string().min(8).max(120)
});

function daysAgoStart(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getScopedVenueIds(user) {
  if (!user) return [];

  if (user.role === "admin") {
    const venues = await prisma.venue.findMany({ select: { id: true } });
    return venues.map((venue) => venue.id);
  }

  if (user.role === "producer") {
    const [accesses, created] = await Promise.all([
      prisma.producerVenueAccess.findMany({
        where: { producerId: user.id },
        select: { venueId: true }
      }),
      prisma.venue.findMany({
        where: { createdByUserId: user.id },
        select: { id: true }
      })
    ]);

    return Array.from(new Set([
      ...accesses.map((item) => item.venueId),
      ...created.map((item) => item.id)
    ]));
  }

  if (user.role === "venue_manager") {
    const [managerAccesses, managedDirectly] = await Promise.all([
      prisma.venueManagerAccess.findMany({
        where: { userId: user.id },
        select: { venueId: true }
      }),
      prisma.venue.findMany({
        where: { managerUserId: user.id },
        select: { id: true }
      })
    ]);

    return Array.from(new Set([
      ...managerAccesses.map((item) => item.venueId),
      ...managedDirectly.map((item) => item.id)
    ]));
  }

  return [];
}

export async function linkVisitorToUser(visitorId, userId) {
  if (!visitorId || !userId) return;

  const parsed = trackVisitSchema.safeParse({ visitorId });
  if (!parsed.success) return;

  const existing = await prisma.audienceVisitor.findUnique({
    where: { visitorId: parsed.data.visitorId }
  });

  if (!existing) {
    await prisma.audienceVisitor.create({
      data: {
        visitorId: parsed.data.visitorId,
        userId,
        linkedAt: new Date()
      }
    });
    return;
  }

  if (!existing.userId) {
    await prisma.audienceVisitor.update({
      where: { visitorId: parsed.data.visitorId },
      data: {
        userId,
        linkedAt: new Date(),
        lastSeenAt: new Date(),
        hits: { increment: 1 }
      }
    });
  }
}

export async function trackAudienceVisit(req, res) {
  const parsed = trackVisitSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      message: "visitorId invalido.",
      details: parsed.error.flatten()
    });
  }

  const { visitorId } = parsed.data;
  const userId = req.user?.id || null;

  const existing = await prisma.audienceVisitor.findUnique({ where: { visitorId } });

  if (!existing) {
    await prisma.audienceVisitor.create({
      data: {
        visitorId,
        userId,
        linkedAt: userId ? new Date() : null
      }
    });
    return res.status(201).json({ ok: true, created: true });
  }

  await prisma.audienceVisitor.update({
    where: { visitorId },
    data: {
      lastSeenAt: new Date(),
      hits: { increment: 1 },
      userId: existing.userId || userId,
      linkedAt: !existing.userId && userId ? new Date() : existing.linkedAt
    }
  });

  return res.json({ ok: true, created: false });
}

export async function getAudienceSummary(req, res) {
  const days = Number(req.query.days || 30);
  const periodDays = Number.isFinite(days) && days > 0 && days <= 365 ? Math.floor(days) : 30;
  const since = daysAgoStart(periodDays);

  const user = req.user;
  const role = user?.role || "attendee";
  const scopedVenueIds = await getScopedVenueIds(user);

  const [
    registeredUsers,
    newRegisteredUsers,
    visitorsPeriod,
    loggedVisitorsPeriod,
    linkedVisitorsPeriod,
    totalVisitors,
    roleBreakdown
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.audienceVisitor.count({ where: { lastSeenAt: { gte: since } } }),
    prisma.audienceVisitor.count({
      where: {
        userId: { not: null },
        lastSeenAt: { gte: since }
      }
    }),
    prisma.audienceVisitor.count({
      where: {
        linkedAt: { gte: since }
      }
    }),
    prisma.audienceVisitor.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } })
  ]);

  const global = {
    registeredUsers,
    newRegisteredUsers,
    activeAudience: visitorsPeriod,
    activeRegistered: loggedVisitorsPeriod,
    activeVisitorsOnly: Math.max(visitorsPeriod - loggedVisitorsPeriod, 0),
    linkedVisitors: linkedVisitorsPeriod,
    conversionRate: visitorsPeriod > 0
      ? Number(((linkedVisitorsPeriod / visitorsPeriod) * 100).toFixed(2))
      : 0,
    totalAudienceTracked: totalVisitors
  };

  const roleTotals = roleBreakdown.reduce((acc, item) => {
    acc[item.role] = item._count._all;
    return acc;
  }, {});

  let scoped = {
    scope: role,
    venueCount: scopedVenueIds.length,
    radarUsers: 0,
    attendeesUsers: 0,
    eventsUpcoming: 0,
    visitorsFromSystem: global.activeAudience
  };

  if (scopedVenueIds.length > 0) {
    const [radarRows, historyRows, upcomingEvents] = await Promise.all([
      prisma.markedEvent.findMany({
        where: {
          createdAt: { gte: since },
          event: { venueId: { in: scopedVenueIds } }
        },
        select: { userId: true }
      }),
      prisma.userEventHistory.findMany({
        where: {
          createdAt: { gte: since },
          event: { venueId: { in: scopedVenueIds } }
        },
        select: { userId: true }
      }),
      prisma.event.count({
        where: {
          venueId: { in: scopedVenueIds },
          startDate: { gte: new Date() }
        }
      })
    ]);

    scoped = {
      ...scoped,
      radarUsers: new Set(radarRows.map((row) => row.userId)).size,
      attendeesUsers: new Set(historyRows.map((row) => row.userId)).size,
      eventsUpcoming: upcomingEvents
    };
  }

  return res.json({
    periodDays,
    role,
    global,
    roleTotals,
    scoped
  });
}
