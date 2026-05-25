import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createSchema = z.object({
  title: z.string().min(3).max(80),
  date: z.coerce.date(),
  mode: z.enum(["manual", "automatic"]).default("manual"),
  eventIds: z.array(z.string().uuid()).min(1).max(6)
});

const idSchema = z.object({ id: z.string().uuid() });

const suggestSchema = z.object({
  date: z.coerce.date(),
  region: z.string().optional(),
  limit: z.coerce.number().int().min(2).max(5).default(3)
});

function estimateTransitMinutes(prevRegion, nextRegion) {
  if (!prevRegion || !nextRegion) return 35;
  return prevRegion === nextRegion ? 25 : 55;
}

function computeRisk(prevEnd, nextStart, transitMinutes) {
  const gapMin = Math.floor((nextStart.getTime() - prevEnd.getTime()) / 60000);
  const remaining = gapMin - transitMinutes;
  if (remaining >= 25) return { risk: "ok", score: 0, transitMinutes };
  if (remaining >= 0) return { risk: "tight", score: 1, transitMinutes };
  return { risk: "risky", score: 2, transitMinutes };
}

function mapItinerary(item) {
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    mode: item.mode,
    status: item.status,
    totalTransitMinutes: item.totalTransitMinutes,
    riskScore: item.riskScore,
    items: item.items
      .sort((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        position: row.position,
        eventId: row.eventId,
        title: row.event.title,
        artist: row.event.artists[0]?.artist.name || "",
        venue: row.event.venue.name,
        region: row.event.venue.region,
        startsAt: row.event.startDate,
        endsAt: row.event.endDate,
        transitMinutesFromPrev: row.transitMinutesFromPrev,
        riskLevel: row.riskLevel
      }))
  };
}

async function buildItems(eventIds) {
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds }, status: "confirmed" },
    include: {
      venue: true,
      artists: { include: { artist: true }, orderBy: { order: "asc" } }
    }
  });
  const sorted = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  if (sorted.length !== eventIds.length) {
    return { error: { code: "event_not_found", message: "Um ou mais eventos nao foram encontrados." } };
  }

  let totalTransit = 0;
  let riskScore = 0;
  const items = sorted.map((event, idx) => {
    if (idx === 0) {
      return { event, position: 0, transitMinutesFromPrev: 0, riskLevel: "ok" };
    }
    const prev = sorted[idx - 1];
    const transit = estimateTransitMinutes(prev.venue.region, event.venue.region);
    const risk = computeRisk(prev.endDate, event.startDate, transit);
    totalTransit += transit;
    riskScore += risk.score;
    return { event, position: idx, transitMinutesFromPrev: transit, riskLevel: risk.risk };
  });

  return { items, totalTransit, riskScore };
}

export async function listPelaHora(req, res, next) {
  try {
    const items = await prisma.itinerary.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            event: {
              include: {
                venue: true,
                artists: { include: { artist: true }, orderBy: { order: "asc" } }
              }
            }
          }
        }
      },
      orderBy: { date: "desc" }
    });
    res.json({ items: items.map(mapItinerary) });
  } catch (error) {
    next(error);
  }
}

export async function getPelaHoraById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const item = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            event: {
              include: {
                venue: true,
                artists: { include: { artist: true }, orderBy: { order: "asc" } }
              }
            }
          }
        }
      }
    });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ error: "itinerary_not_found", message: "Pela Hora nao encontrado." });
    }
    res.json({ item: mapItinerary(item) });
  } catch (error) {
    next(error);
  }
}

export async function createPelaHora(req, res, next) {
  try {
    const payload = createSchema.parse(req.body);
    const built = await buildItems(payload.eventIds);
    if (built.error) return res.status(404).json(built.error);

    const created = await prisma.itinerary.create({
      data: {
        userId: req.user.id,
        title: payload.title,
        date: payload.date,
        mode: payload.mode,
        totalTransitMinutes: built.totalTransit,
        riskScore: built.riskScore,
        items: {
          create: built.items.map((row) => ({
            eventId: row.event.id,
            position: row.position,
            transitMinutesFromPrev: row.transitMinutesFromPrev,
            riskLevel: row.riskLevel
          }))
        }
      },
      include: {
        items: {
          include: {
            event: {
              include: {
                venue: true,
                artists: { include: { artist: true }, orderBy: { order: "asc" } }
              }
            }
          }
        }
      }
    });
    res.status(201).json({ item: mapItinerary(created) });
  } catch (error) {
    next(error);
  }
}

export async function deletePelaHora(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const item = await prisma.itinerary.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ error: "itinerary_not_found", message: "Pela Hora nao encontrado." });
    }

    await prisma.$transaction([
      prisma.itineraryItem.deleteMany({ where: { itineraryId: id } }),
      prisma.itinerary.delete({ where: { id } })
    ]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function suggestPelaHora(req, res, next) {
  try {
    const { date, region, limit } = suggestSchema.parse(req.query);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        status: "confirmed",
        startDate: { gte: start, lte: end },
        ...(region ? { venue: { region } } : {})
      },
      include: {
        venue: true,
        artists: { include: { artist: true }, orderBy: { order: "asc" } }
      },
      orderBy: { startDate: "asc" },
      take: 40
    });

    const picked = [];
    for (const event of events) {
      if (picked.length === 0) {
        picked.push(event);
        continue;
      }
      const prev = picked[picked.length - 1];
      const transit = estimateTransitMinutes(prev.venue.region, event.venue.region);
      const gapMin = Math.floor((event.startDate.getTime() - prev.endDate.getTime()) / 60000);
      if (gapMin >= transit) {
        picked.push(event);
      }
      if (picked.length >= limit) break;
    }

    if (picked.length < 2) {
      return res.json({
        suggestion: null,
        message: "Nao encontramos uma sequencia boa para esse dia. Tente outra regiao."
      });
    }

    const built = await buildItems(picked.map((event) => event.id));
    res.json({
      suggestion: {
        title: "Pela Hora do Dia",
        date: start,
        mode: "automatic",
        totalTransitMinutes: built.totalTransit,
        riskScore: built.riskScore,
        eventIds: picked.map((event) => event.id),
        items: built.items.map((row) => ({
          eventId: row.event.id,
          title: row.event.title,
          artist: row.event.artists[0]?.artist.name || "",
          venue: row.event.venue.name,
          region: row.event.venue.region,
          startsAt: row.event.startDate,
          endsAt: row.event.endDate,
          transitMinutesFromPrev: row.transitMinutesFromPrev,
          riskLevel: row.riskLevel
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}
