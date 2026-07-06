import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageEvent } from "../lib/access.control.js";
import { formatPriceLabel, formatPriceSecondaryLabel } from "../utils/price.js";

const querySchema = z.object({
  region: z.string().trim().min(1).optional(),
  venueId: z.string().uuid().optional(),
  includeDrafts: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true")
});

const recurrenceDaySchema = z.enum(["dom", "seg", "ter", "qua", "qui", "sex", "sab"]);

const eventTypeSchema = z.enum([
  "roda_samba",
  "pagode",
  "gafieira",
  "samba_rock",
  "feijoada_sambista"
]);

const ticketTypeSchema = z.enum(["free", "paid", "consumacao"]);
const eventStatusSchema = z.enum(["draft", "confirmed"]);

const eventBaseSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(3).optional(),
  imageUrl: z.string().url().optional(),
  type: eventTypeSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  ticketType: ticketTypeSchema,
  ticketUrl: z.string().url().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  consumacaoValue: z.number().nonnegative().optional(),
  couvertArtistico: z.number().nonnegative().optional(),
  venueId: z.string().uuid(),
  artistName: z.string().trim().min(2).optional(),
  status: eventStatusSchema.optional().default("confirmed"),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDays: z.array(recurrenceDaySchema).optional().default([]),
  recurrenceStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  recurrenceEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  recurrenceUntil: z.coerce.date().optional(),
  recurrenceExceptions: z.array(z.coerce.date()).optional().default([])
});

const createEventSchema = eventBaseSchema
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate deve ser maior que startDate",
    path: ["endDate"]
  })
  .refine((data) => !data.isRecurring || (data.recurrenceDays || []).length > 0, {
    message: "Selecione ao menos um dia da semana para recorrencia.",
    path: ["recurrenceDays"]
  });

const updateEventSchema = eventBaseSchema.partial().refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return data.endDate > data.startDate;
  },
  {
    message: "endDate deve ser maior que startDate",
    path: ["endDate"]
  }
).refine(
  (data) => {
    if (!data.isRecurring) return true;
    if (data.recurrenceDays === undefined) return true;
    return data.recurrenceDays.length > 0;
  },
  {
    message: "Selecione ao menos um dia da semana para recorrencia.",
    path: ["recurrenceDays"]
  }
);

const idSchema = z.object({
  id: z.string().uuid()
});

function dayKeyFromDate(date) {
  const keys = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  return keys[date.getDay()];
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function parseTimeOrFallback(timeValue, fallbackDate) {
  if (!timeValue) {
    return { hours: fallbackDate.getHours(), minutes: fallbackDate.getMinutes() };
  }
  const [hours, minutes] = timeValue.split(":").map(Number);
  return { hours, minutes };
}

function computeDurationMs(event) {
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  const diff = end - start;
  return diff > 0 ? diff : 2 * 60 * 60 * 1000;
}

function getRecurringOccurrences(event, now = new Date(), lookbackDays = 1, lookaheadDays = 14, maxItems = 4) {
  if (!event.isRecurring) return [];
  const days = event.recurrenceDays || [];
  if (days.length === 0) return [];

  const startRef = new Date(event.startDate);
  const until = event.recurrenceUntil ? new Date(event.recurrenceUntil) : null;
  const startTime = parseTimeOrFallback(event.recurrenceStartTime, startRef);
  const durationMs = computeDurationMs(event);
  const exceptions = new Set((event.recurrenceExceptions || []).map((value) => dateKey(new Date(value))));
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - lookbackDays);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  to.setDate(to.getDate() + lookaheadDays);

  const out = [];
  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const dayStart = new Date(cursor);
    if (dayStart < new Date(startRef.getFullYear(), startRef.getMonth(), startRef.getDate())) continue;
    if (until && dayStart > until) continue;
    const dayKey = dayKeyFromDate(dayStart);
    if (!days.includes(dayKey)) continue;
    if (exceptions.has(dateKey(dayStart))) continue;

    const startsAt = new Date(dayStart);
    startsAt.setHours(startTime.hours, startTime.minutes, 0, 0);
    const endsAt = new Date(startsAt.getTime() + durationMs);
    if (endsAt < now && out.length >= maxItems) continue;
    if (endsAt < from) continue;

    out.push({ startsAt, endsAt });
  }

  const sorted = out
    .filter((item) => item.endsAt >= from)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const live = sorted.filter((item) => item.startsAt <= now && item.endsAt >= now);
  const upcoming = sorted.filter((item) => item.startsAt > now).slice(0, Math.max(0, maxItems - live.length));
  return [...live, ...upcoming];
}

function mapEventPayload(event) {
  return {
    id: event.id,
    baseEventId: event.id,
    title: event.title,
    artistId: event.artists[0]?.artist.id ?? null,
    artist: event.artists[0]?.artist.name ?? "",
    artistImageUrl: event.artists[0]?.artist.imageUrl ?? "",
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: event.venue.name,
    venueDisplayNameWithArticle: event.venue.displayNameWithArticle ?? event.venue.name,
    venueDisplayNameWithPreposition: event.venue.displayNameWithPreposition ?? `em ${event.venue.name}`,
    region: event.venue.region,
    neighborhood: event.venue.neighborhood ?? "",
    neighborhoodDisplayNameWithArticle: event.venue.neighborhoodDisplayNameWithArticle ?? event.venue.neighborhood ?? "",
    neighborhoodDisplayNameWithPreposition: event.venue.neighborhoodDisplayNameWithPreposition ?? `em ${event.venue.neighborhood ?? ""}`.trim(),
    venueAddress: event.venue.address ?? "",
    venueCity: event.venue.city ?? "",
    venueState: event.venue.state ?? "",
    venueOpenDays: event.venue.openDays ?? [],
    type: event.type,
    startsAt: event.startDate,
    endsAt: event.endDate,
    isRecurring: Boolean(event.isRecurring),
    recurrenceDays: event.recurrenceDays ?? [],
    recurrenceStartTime: event.recurrenceStartTime ?? "",
    recurrenceEndTime: event.recurrenceEndTime ?? "",
    recurrenceUntil: event.recurrenceUntil ?? null,
    recurrenceExceptions: event.recurrenceExceptions ?? [],
    tags: event.tags ?? [],
    priceLabel: formatPriceLabel(event.priceMin, event.priceMax, event.ticketType),
    priceSecondaryLabel: formatPriceSecondaryLabel(event),
    imageUrl: event.imageUrl ?? event.venue.imageUrl ?? "",
    status: event.status ?? "confirmed"
  };
}

function expandEventPayloadForExplore(event, now = new Date()) {
  const base = mapEventPayload(event);
  if (!base.isRecurring) {
    return [{
      ...base,
      isLiveNow: new Date(base.startsAt) <= now && new Date(base.endsAt) >= now
    }];
  }

  const occurrences = getRecurringOccurrences(event, now, 1, 14, 4);
  if (occurrences.length === 0) {
    return [];
  }

  return occurrences.map((occurrence) => ({
    ...base,
    id: `${base.baseEventId}__${occurrence.startsAt.toISOString()}`,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    isLiveNow: occurrence.startsAt <= now && occurrence.endsAt >= now
  }));
}

function mapEventDetailPayload(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    imageUrl: event.imageUrl ?? "",
    type: event.type,
    tags: event.tags ?? [],
    startDate: event.startDate,
    endDate: event.endDate,
    ticketType: event.ticketType,
    ticketUrl: event.ticketUrl ?? "",
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    consumacaoValue: event.consumacaoValue,
    couvertArtistico: event.couvertArtistico,
    pricingPolicy: null,
    isRecurring: Boolean(event.isRecurring),
    recurrenceDays: event.recurrenceDays ?? [],
    recurrenceStartTime: event.recurrenceStartTime ?? "",
    recurrenceEndTime: event.recurrenceEndTime ?? "",
    recurrenceUntil: event.recurrenceUntil ?? null,
    recurrenceExceptions: event.recurrenceExceptions ?? [],
    status: event.status ?? "confirmed",
    venueId: event.venueId,
    artistName: event.artists[0]?.artist.name ?? "",
    artistId: event.artists[0]?.artist.id ?? null,
    artistImageUrl: event.artists[0]?.artist.imageUrl ?? "",
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      displayNameWithArticle: event.venue.displayNameWithArticle ?? event.venue.name,
      displayNameWithPreposition: event.venue.displayNameWithPreposition ?? `em ${event.venue.name}`,
      address: event.venue.address ?? "",
      city: event.venue.city ?? "",
      state: event.venue.state ?? "",
      region: event.venue.region,
      neighborhood: event.venue.neighborhood ?? "",
      neighborhoodDisplayNameWithArticle: event.venue.neighborhoodDisplayNameWithArticle ?? event.venue.neighborhood ?? "",
      neighborhoodDisplayNameWithPreposition: event.venue.neighborhoodDisplayNameWithPreposition ?? `em ${event.venue.neighborhood ?? ""}`.trim(),
      openDays: event.venue.openDays ?? []
    }
  };
}

export async function listEvents(req, res, next) {
  try {
    const { region, venueId, includeDrafts } = querySchema.parse(req.query);
    const role = req.user?.role;
    const canIncludeDrafts = ["admin", "producer", "venue_manager"].includes(role);
    const includeDraftsSafe = canIncludeDrafts ? includeDrafts : false;
    const isProducer = req.user?.role === "producer";
    const venueScope = {};
    if (region) {
      venueScope.region = region;
    }
    if (isProducer) {
      venueScope.OR = [
        ...(venueScope.OR || []),
        { createdByUserId: req.user.id },
        { producerAccesses: { some: { producerId: req.user.id } } }
      ];
    }
    const items = await prisma.event.findMany({
      where: {
        status: includeDraftsSafe ? undefined : "confirmed",
        ...(isProducer
          ? {
              OR: [
                { createdByUserId: req.user.id },
                { venue: { producerAccesses: { some: { producerId: req.user.id } } } },
                { artists: { some: { artist: { producerAccesses: { some: { producerId: req.user.id } } } } } }
              ]
            }
          : {}),
        ...(venueId ? { venueId } : {}),
        ...(Object.keys(venueScope).length > 0 ? { venue: venueScope } : {})
      },
      include: {
        venue: {
          include: {
            producerAccesses: {
              select: { producerId: true }
            }
          }
        },
        artists: {
          include: {
            artist: {
              include: {
                producerAccesses: {
                  select: { producerId: true }
                }
              }
            }
          },
          orderBy: {
            order: "asc"
          }
        }
      },
      orderBy: {
        startDate: "asc"
      }
    });

    const now = new Date();
    const payload = items
      .flatMap((event) => expandEventPayloadForExplore(event, now))
      .filter((item) => new Date(item.endsAt).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    res.json({ items: payload });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const data = createEventSchema.parse(req.body);

    const venueExists = await prisma.venue.findUnique({
      where: { id: data.venueId },
      include: {
        managerAccesses: {
          select: { userId: true }
        },
        producerAccesses: {
          select: { producerId: true }
        }
      }
    });

    if (!venueExists) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if (
      req.user.role === "producer" &&
      venueExists.createdByUserId !== req.user.id &&
      !(venueExists.producerAccesses || []).some((entry) => entry.producerId === req.user.id)
    ) {
      return res.status(403).json({
        error: "forbidden",
        message: "Produtor so pode criar eventos em casas aprovadas."
      });
    }

    if (
      req.user.role === "venue_manager" &&
      venueExists.managerUserId !== req.user.id &&
      !(venueExists.managerAccesses || []).some((entry) => entry.userId === req.user.id)
    ) {
      return res.status(403).json({
        error: "forbidden",
        message: "Perfil casa so pode criar eventos nas suas casas vinculadas."
      });
    }

    let artist = null;
    if (data.artistName) {
      const artistSlug = data.artistName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      artist = await prisma.artist.upsert({
        where: { slug: artistSlug },
        update: {},
        create: {
          name: data.artistName,
          slug: artistSlug,
          genres: ["samba"]
        }
      });
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        type: data.type,
        tags: data.tags,
        startDate: data.startDate,
        endDate: data.endDate,
        ticketType: data.ticketType,
        ticketUrl: data.ticketUrl,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        consumacaoValue: data.consumacaoValue,
        couvertArtistico: data.couvertArtistico,
        isRecurring: data.isRecurring ?? false,
        recurrenceDays: data.isRecurring ? data.recurrenceDays ?? [] : [],
        recurrenceStartTime: data.isRecurring ? data.recurrenceStartTime ?? null : null,
        recurrenceEndTime: data.isRecurring ? data.recurrenceEndTime ?? null : null,
        recurrenceUntil: data.isRecurring ? data.recurrenceUntil ?? null : null,
        recurrenceExceptions: data.isRecurring ? (data.recurrenceExceptions ?? []) : [],
        venueId: data.venueId,
        status: data.status ?? "confirmed",
        createdByUserId: req.user.id,
        ...(artist ? { artists: { create: [{ artistId: artist.id, order: 0 }] } } : {})
      },
      include: {
        venue: true,
        artists: {
          include: { artist: true },
          orderBy: { order: "asc" }
        }
      }
    });

    res.status(201).json({ item: mapEventPayload(event) });
  } catch (error) {
    next(error);
  }
}

export async function getEventById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        artists: {
          include: { artist: true },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    const role = req.user?.role;
    const canReadDraft = ["admin", "producer", "venue_manager"].includes(role) && canManageEvent(req.user, event);
    if (event.status === "draft" && !canReadDraft) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    res.json({ item: mapEventDetailPayload(event) });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const data = updateEventSchema.parse(req.body);

    const existing = await prisma.event.findUnique({
      where: { id },
      include: {
        artists: true,
        venue: {
          include: {
          managerAccesses: {
            select: { userId: true }
          },
          producerAccesses: {
            select: { producerId: true }
          }
        }
      }
      }
    });

    if (!existing) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    if (!canManageEvent(req.user, existing)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode editar este evento."
      });
    }

    if (data.venueId) {
      const venueExists = await prisma.venue.findUnique({
        where: { id: data.venueId },
        include: {
          managerAccesses: {
            select: { userId: true }
          },
          producerAccesses: {
            select: { producerId: true }
          }
        }
      });
      if (!venueExists) {
        return res.status(404).json({
          error: "venue_not_found",
          message: "Casa de samba nao encontrada."
        });
      }
      if (
        req.user.role === "producer" &&
        venueExists.createdByUserId !== req.user.id &&
        !venueExists.producerAccesses.some((entry) => entry.producerId === req.user.id)
      ) {
        return res.status(403).json({
          error: "forbidden",
          message: "Produtor so pode mover eventos para casas aprovadas."
        });
      }
      if (
        req.user.role === "venue_manager" &&
        venueExists.managerUserId !== req.user.id &&
        !venueExists.managerAccesses.some((entry) => entry.userId === req.user.id)
      ) {
        return res.status(403).json({
          error: "forbidden",
          message: "Perfil casa so pode mover eventos para casas vinculadas."
        });
      }
    }

    let artistId = null;
    if (data.artistName) {
      const artistSlug = data.artistName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const artist = await prisma.artist.upsert({
        where: { slug: artistSlug },
        update: { name: data.artistName },
        create: {
          name: data.artistName,
          slug: artistSlug,
          genres: ["samba"]
        }
      });
      artistId = artist.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const event = await tx.event.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          type: data.type,
          tags: data.tags,
          startDate: data.startDate,
          endDate: data.endDate,
          ticketType: data.ticketType,
          ticketUrl: data.ticketUrl,
          priceMin: data.priceMin,
          priceMax: data.priceMax,
          consumacaoValue: data.consumacaoValue,
          couvertArtistico: data.couvertArtistico,
          venueId: data.venueId,
          isRecurring: data.isRecurring,
          recurrenceDays: data.isRecurring === false
            ? []
            : data.recurrenceDays,
          recurrenceStartTime: data.isRecurring === false
            ? null
            : data.recurrenceStartTime,
          recurrenceEndTime: data.isRecurring === false
            ? null
            : data.recurrenceEndTime,
          recurrenceUntil: data.isRecurring === false
            ? null
            : data.recurrenceUntil,
          recurrenceExceptions: data.isRecurring === false
            ? []
            : data.recurrenceExceptions,
          status: data.status
        }
      });

      if (artistId) {
        await tx.eventArtist.deleteMany({ where: { eventId: event.id } });
        await tx.eventArtist.create({
          data: {
            eventId: event.id,
            artistId,
            order: 0
          }
        });
      }

      return tx.event.findUnique({
        where: { id: event.id },
        include: {
          venue: true,
          artists: {
            include: { artist: true },
            orderBy: { order: "asc" }
          }
        }
      });
    });

    res.json({ item: mapEventPayload(updated) });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);

    const existing = await prisma.event.findUnique({
      where: { id },
      include: {
        artists: {
          include: {
            artist: {
              include: {
                producerAccesses: {
                  select: { producerId: true }
                }
              }
            }
          }
        },
        venue: {
          include: {
            managerAccesses: {
              select: { userId: true }
            },
            producerAccesses: {
              select: { producerId: true }
            }
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    if (!canManageEvent(req.user, existing)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode excluir este evento."
      });
    }

    await prisma.$transaction([
      prisma.eventArtist.deleteMany({ where: { eventId: id } }),
      prisma.markedEvent.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } })
    ]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
