import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageEvent } from "../lib/access.control.js";

const querySchema = z.object({
  region: z.string().trim().min(1).optional(),
  venueId: z.string().uuid().optional()
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
const pricingPolicySchema = z.object({
  freeUntil: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  menFreeUntil: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  womenFreeUntil: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  womenFreeAllNight: z.boolean().optional().default(false)
}).optional();

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
  pricingPolicy: pricingPolicySchema,
  venueId: z.string().uuid(),
  artistName: z.string().trim().min(2),
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

function getRecurringOccurrence(event, now = new Date()) {
  if (!event.isRecurring) return null;
  const days = event.recurrenceDays || [];
  if (days.length === 0) return null;

  const startRef = new Date(event.startDate);
  const until = event.recurrenceUntil ? new Date(event.recurrenceUntil) : null;
  const startTime = parseTimeOrFallback(event.recurrenceStartTime, startRef);
  const exceptions = new Set((event.recurrenceExceptions || []).map((value) => dateKey(new Date(value))));

  for (let offset = 0; offset <= 120; offset += 1) {
    const candidate = new Date(now);
    candidate.setHours(0, 0, 0, 0);
    candidate.setDate(candidate.getDate() + offset);
    if (candidate < new Date(startRef.toDateString())) continue;
    if (until && candidate > until) break;

    const dayKey = dayKeyFromDate(candidate);
    if (!days.includes(dayKey)) continue;
    if (exceptions.has(dateKey(candidate))) continue;

    candidate.setHours(startTime.hours, startTime.minutes, 0, 0);
    if (candidate >= now) return candidate;
  }

  return null;
}

function formatPriceLabel(priceMin, priceMax, ticketType) {
  if (ticketType === "free") return "Gratuito";
  if (ticketType === "consumacao") return "Consumacao";
  if (priceMin == null && priceMax == null) return "Consulte valores";
  if (priceMin != null && priceMax != null && priceMin !== priceMax) {
    return `R$ ${priceMin} - R$ ${priceMax}`;
  }
  const value = priceMin ?? priceMax;
  return `R$ ${value}`;
}

function formatPriceSecondaryLabel(event) {
  const parts = [];
  if (event.ticketType === "consumacao" && event.consumacaoValue != null) {
    parts.push(`Consumacao minima R$ ${event.consumacaoValue}`);
  }
  if (event.couvertArtistico != null) {
    parts.push(`Couvert artistico R$ ${event.couvertArtistico}`);
  }

  const policy = event.pricingPolicy || {};
  if (policy.freeUntil) parts.push(`Gratis ate ${policy.freeUntil}`);
  if (policy.menFreeUntil) parts.push(`Homem gratis ate ${policy.menFreeUntil}`);
  if (policy.womenFreeAllNight) {
    parts.push("Mulher gratis a noite toda");
  } else if (policy.womenFreeUntil) {
    parts.push(`Mulher gratis ate ${policy.womenFreeUntil}`);
  }

  return parts.join(" | ");
}

function mapEventPayload(event) {
  const nextRecurringStart = getRecurringOccurrence(event);
  const startsAt = event.isRecurring && nextRecurringStart ? nextRecurringStart : event.startDate;
  const endsAt = event.isRecurring && nextRecurringStart
    ? new Date(nextRecurringStart.getTime() + computeDurationMs(event))
    : event.endDate;

  return {
    id: event.id,
    title: event.title,
    artistId: event.artists[0]?.artist.id ?? null,
    artist: event.artists[0]?.artist.name ?? "Artista NaPalma",
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: event.venue.name,
    region: event.venue.region,
    venueAddress: event.venue.address ?? "",
    venueCity: event.venue.city ?? "",
    venueState: event.venue.state ?? "",
    venueOpenDays: event.venue.openDays ?? [],
    type: event.type,
    startsAt,
    endsAt,
    isRecurring: Boolean(event.isRecurring),
    recurrenceDays: event.recurrenceDays ?? [],
    recurrenceStartTime: event.recurrenceStartTime ?? "",
    recurrenceEndTime: event.recurrenceEndTime ?? "",
    recurrenceUntil: event.recurrenceUntil ?? null,
    recurrenceExceptions: event.recurrenceExceptions ?? [],
    priceLabel: formatPriceLabel(event.priceMin, event.priceMax, event.ticketType),
    priceSecondaryLabel: formatPriceSecondaryLabel(event),
    imageUrl: event.imageUrl ?? event.venue.imageUrl ?? ""
  };
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
    pricingPolicy: event.pricingPolicy ?? null,
    isRecurring: Boolean(event.isRecurring),
    recurrenceDays: event.recurrenceDays ?? [],
    recurrenceStartTime: event.recurrenceStartTime ?? "",
    recurrenceEndTime: event.recurrenceEndTime ?? "",
    recurrenceUntil: event.recurrenceUntil ?? null,
    recurrenceExceptions: event.recurrenceExceptions ?? [],
    venueId: event.venueId,
    artistName: event.artists[0]?.artist.name ?? "",
    artistId: event.artists[0]?.artist.id ?? null,
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      address: event.venue.address ?? "",
      city: event.venue.city ?? "",
      state: event.venue.state ?? "",
      region: event.venue.region,
      openDays: event.venue.openDays ?? []
    }
  };
}

export async function listEvents(req, res, next) {
  try {
    const { region, venueId } = querySchema.parse(req.query);
    const isVenueManager = req.user?.role === "venue_manager";
    const isProducer = req.user?.role === "producer";
    const venueScope = {};
    if (isVenueManager) {
      venueScope.OR = [
        { managerUserId: req.user.id },
        { managerAccesses: { some: { userId: req.user.id } } }
      ];
    }
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
        status: "confirmed",
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

    const payload = items.map(mapEventPayload);

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
        producerAccesses: {
          select: { producerId: true }
        },
        managerAccesses: {
          select: { userId: true }
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
      req.user.role === "venue_manager" &&
      venueExists.managerUserId !== req.user.id &&
      !venueExists.managerAccesses.some((entry) => entry.userId === req.user.id)
    ) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce so pode criar eventos para sua casa."
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

    const artistSlug = data.artistName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const artist = await prisma.artist.upsert({
      where: { slug: artistSlug },
      update: {},
      create: {
        name: data.artistName,
        slug: artistSlug,
        genres: ["samba"]
      }
    });

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
        pricingPolicy: data.pricingPolicy,
        isRecurring: data.isRecurring ?? false,
        recurrenceDays: data.isRecurring ? data.recurrenceDays ?? [] : [],
        recurrenceStartTime: data.isRecurring ? data.recurrenceStartTime ?? null : null,
        recurrenceEndTime: data.isRecurring ? data.recurrenceEndTime ?? null : null,
        recurrenceUntil: data.isRecurring ? data.recurrenceUntil ?? null : null,
        recurrenceExceptions: data.isRecurring ? (data.recurrenceExceptions ?? []) : [],
        venueId: data.venueId,
        createdByUserId: req.user.id,
        artists: {
          create: [{ artistId: artist.id, order: 0 }]
        }
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
            producerAccesses: {
              select: { producerId: true }
            },
            managerAccesses: {
              select: { userId: true }
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
          producerAccesses: {
            select: { producerId: true }
          },
          managerAccesses: {
            select: { userId: true }
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
        req.user.role === "venue_manager" &&
        venueExists.managerUserId !== req.user.id &&
        !venueExists.managerAccesses.some((entry) => entry.userId === req.user.id)
      ) {
        return res.status(403).json({
          error: "forbidden",
          message: "Voce so pode mover eventos para sua casa."
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
          pricingPolicy: data.pricingPolicy,
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
            : data.recurrenceExceptions
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
            producerAccesses: {
              select: { producerId: true }
            },
            managerAccesses: {
              select: { userId: true }
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
