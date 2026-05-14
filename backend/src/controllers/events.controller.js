import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageEvent } from "../utils/ownership.js";

const querySchema = z.object({
  region: z.string().trim().min(1).optional()
});

const eventTypeSchema = z.enum([
  "roda_samba",
  "pagode",
  "gafieira",
  "samba_rock",
  "feijoada_sambista"
]);

const ticketTypeSchema = z.enum(["free", "paid", "consumacao"]);

const createEventSchema = z
  .object({
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
    venueId: z.string().uuid(),
    artistName: z.string().trim().min(2)
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate deve ser maior que startDate",
    path: ["endDate"]
  });

const updateEventSchema = createEventSchema.partial().refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return data.endDate > data.startDate;
  },
  {
    message: "endDate deve ser maior que startDate",
    path: ["endDate"]
  }
);

const idSchema = z.object({
  id: z.string().uuid()
});

function formatPriceLabel(priceMin, priceMax, ticketType) {
  if (ticketType === "free") return "Gratuito";
  if (priceMin == null && priceMax == null) return "Consulte valores";
  if (priceMin != null && priceMax != null && priceMin !== priceMax) {
    return `R$ ${priceMin} - R$ ${priceMax}`;
  }
  const value = priceMin ?? priceMax;
  return `R$ ${value}`;
}

function mapEventPayload(event) {
  return {
    id: event.id,
    title: event.title,
    artist: event.artists[0]?.artist.name ?? "Artista NaPalma",
    venue: event.venue.name,
    region: event.venue.region,
    type: event.type,
    startsAt: event.startDate,
    priceLabel: formatPriceLabel(event.priceMin, event.priceMax, event.ticketType),
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
    venueId: event.venueId,
    artistName: event.artists[0]?.artist.name ?? "",
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      region: event.venue.region
    }
  };
}

export async function listEvents(req, res, next) {
  try {
    const { region } = querySchema.parse(req.query);
    const items = await prisma.event.findMany({
      where: {
        status: "confirmed",
        ...(region ? { venue: { region } } : {})
      },
      include: {
        venue: true,
        artists: {
          include: {
            artist: true
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
          venueId: data.venueId
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
        venue: {
          include: {
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
