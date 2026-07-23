import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshUserAchievements } from "../utils/achievements.js";

const eventIdSchema = z.object({
  eventId: z.string().uuid()
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().max(500).optional(),
  q: z.string().trim().max(120).default(""),
  eventIds: z.string().trim().max(4000).optional(),
  summary: z.enum(["0", "1"]).default("0")
});

const historyCursorSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime()
});

function mapHistoryEntry(entry) {
  const event = entry.event;
  return {
    id: entry.id,
    eventId: event.id,
    title: event.title,
    venue: event.venue.name,
    region: event.venue.region,
    startsAt: event.startDate,
    attendedAt: entry.createdAt
  };
}

export function encodeHistoryCursor(entry) {
  return Buffer.from(JSON.stringify({
    id: entry.id,
    createdAt: entry.createdAt.toISOString()
  })).toString("base64url");
}

export function decodeHistoryCursor(value) {
  if (!value) return null;
  const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  const parsed = historyCursorSchema.parse(decoded);
  return {
    id: parsed.id,
    createdAt: new Date(parsed.createdAt)
  };
}

function parseEventIds(value) {
  if (!value) return [];
  return z.array(z.string().uuid()).max(100).parse(
    Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)))
  );
}

function buildHistoryWhere({ userId, q, eventIds, cursor }) {
  const filters = [];

  if (q) {
    filters.push({
      OR: [
        { event: { is: { title: { contains: q, mode: "insensitive" } } } },
        { event: { is: { venue: { is: { name: { contains: q, mode: "insensitive" } } } } } }
      ]
    });
  }

  if (eventIds.length > 0) {
    filters.push({ eventId: { in: eventIds } });
  }

  if (cursor) {
    filters.push({
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          AND: [
            { createdAt: cursor.createdAt },
            { id: { lt: cursor.id } }
          ]
        }
      ]
    });
  }

  return {
    userId,
    ...(filters.length ? { AND: filters } : {})
  };
}

async function getHistorySummary(userId) {
  const [totalEvents, venues, artists] = await Promise.all([
    prisma.userEventHistory.count({ where: { userId } }),
    prisma.event.findMany({
      where: { historyBy: { some: { userId } } },
      distinct: ["venueId"],
      select: { venueId: true }
    }),
    prisma.eventArtist.findMany({
      where: { event: { is: { historyBy: { some: { userId } } } } },
      distinct: ["artistId"],
      select: { artistId: true }
    })
  ]);

  return {
    totalEvents,
    venueCount: venues.length,
    artistCount: artists.length
  };
}

export async function listMyHistory(req, res, next) {
  try {
    const query = historyQuerySchema.parse(req.query);
    const eventIds = parseEventIds(query.eventIds);
    let cursor = null;

    try {
      cursor = decodeHistoryCursor(query.cursor);
    } catch (_error) {
      return res.status(400).json({
        error: "invalid_history_cursor",
        message: "Nao foi possivel continuar esse historico. Recarregue a pagina."
      });
    }

    const effectiveLimit = eventIds.length > 0
      ? Math.min(eventIds.length, 100)
      : query.limit;
    const where = buildHistoryWhere({
      userId: req.user.id,
      q: query.q,
      eventIds,
      cursor
    });

    const items = await prisma.userEventHistory.findMany({
      where,
      include: {
        event: {
          include: {
            venue: true
          }
        }
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ],
      take: effectiveLimit + 1
    });

    const hasMore = eventIds.length === 0 && items.length > effectiveLimit;
    const pageItems = hasMore ? items.slice(0, effectiveLimit) : items;
    const summary = query.summary === "1"
      ? await getHistorySummary(req.user.id)
      : undefined;

    res.json({
      items: pageItems.map(mapHistoryEntry),
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? encodeHistoryCursor(pageItems.at(-1)) : null
      },
      ...(summary ? { summary } : {})
    });
  } catch (error) {
    next(error);
  }
}

export async function markEventAsAttended(req, res, next) {
  try {
    const { eventId } = eventIdSchema.parse(req.params);

    const eventExists = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startDate: true, endDate: true }
    });

    if (!eventExists) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    const now = Date.now();
    const startAtMs = new Date(eventExists.startDate).getTime();
    const endAtMsBase = eventExists.endDate ? new Date(eventExists.endDate).getTime() : startAtMs;
    const deadlineMs = endAtMsBase + (24 * 60 * 60 * 1000);

    if (now < startAtMs) {
      return res.status(409).json({
        error: "attendance_window_not_open",
        message: "Esse samba ainda nao comecou. Voce podera confirmar quando ele iniciar."
      });
    }

    if (now > deadlineMs) {
      return res.status(409).json({
        error: "attendance_window_expired",
        message: "Janela encerrada. A confirmacao fica disponivel ate 24h apos o fim do samba."
      });
    }

    await prisma.userEventHistory.upsert({
      where: {
        userId_eventId: {
          userId: req.user.id,
          eventId
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        eventId
      }
    });

    const unlockedAchievements = await refreshUserAchievements(req.user.id);

    res.status(200).json({ unlockedAchievements });
  } catch (error) {
    next(error);
  }
}

export async function unmarkEventAsAttended(req, res, next) {
  try {
    const { eventId } = eventIdSchema.parse(req.params);

    await prisma.userEventHistory.deleteMany({
      where: {
        userId: req.user.id,
        eventId
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
