import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../lib/access.control.js";

const querySchema = z.object({
  q: z.string().trim().min(1).optional(),
  scope: z.enum(["managed", "public"]).optional()
});

const idSchema = z.object({
  id: z.string().uuid()
});

const createArtistSchema = z.object({
  name: z.string().trim().min(2),
  bio: z.string().trim().optional(),
  contactName: z.string().trim().min(2).optional(),
  contactPhone: z.string().trim().min(8).optional(),
  imageUrl: z.string().url().optional(),
  genres: z.array(z.string().trim().min(1)).default(["samba"]),
  isVerified: z.boolean().optional(),
  spotifyUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional()
});

const updateArtistSchema = createArtistSchema.partial();

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapArtistPayload(artist) {
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    bio: artist.bio ?? "",
    contactName: artist.contactName ?? "",
    contactPhone: artist.contactPhone ?? "",
    imageUrl: artist.imageUrl ?? "",
    genres: artist.genres ?? [],
    isVerified: Boolean(artist.isVerified),
    spotifyUrl: artist.spotifyUrl ?? "",
    youtubeUrl: artist.youtubeUrl ?? "",
    instagramUrl: artist.instagramUrl ?? "",
    eventsCount: artist._count?.events ?? 0
  };
}

export async function listArtists(req, res, next) {
  try {
    const { q, scope } = querySchema.parse(req.query);
    const isProducer = req.user?.role === "producer";
    const useManagedScope = scope !== "public";
    const filters = [];
    if (isProducer && useManagedScope) {
      filters.push({
        OR: [
          { createdByUserId: req.user.id },
          { producerAccesses: { some: { producerId: req.user.id } } }
        ]
      });
    }
    if (q) {
      filters.push({
        OR: [{ name: { contains: q, mode: "insensitive" } }, { genres: { hasSome: [q.toLowerCase()] } }]
      });
    }
    const items = await prisma.artist.findMany({
      where: filters.length ? { AND: filters } : undefined,
      include: {
        _count: {
          select: { events: true }
        }
      },
      orderBy: { name: "asc" }
    });
    res.json({ items: items.map(mapArtistPayload) });
  } catch (error) {
    next(error);
  }
}

export async function getArtistById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        accesses: { select: { userId: true, role: true, status: true } },
        _count: {
          select: { events: true }
        }
      }
    });

    if (!artist) {
      return res.status(404).json({
        error: "artist_not_found",
        message: "Artista nao encontrado."
      });
    }

    if (req.user?.role === "producer" && !canManageArtist(req.user, artist)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode acessar este artista."
      });
    }

    res.json({ item: mapArtistPayload(artist) });
  } catch (error) {
    next(error);
  }
}

export async function getArtistProfile(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        _count: {
          select: { events: true, followers: true }
        }
      }
    });

    if (!artist) {
      return res.status(404).json({
        error: "artist_not_found",
        message: "Artista nao encontrado."
      });
    }

    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        status: "confirmed",
        startDate: { gte: now },
        artists: { some: { artistId: id } }
      },
      include: {
        venue: true,
        artists: {
          include: { artist: true },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { startDate: "asc" },
      take: 30
    });

    const isFollowing = req.user
      ? Boolean(await prisma.artistFollow.findUnique({
          where: {
            userId_artistId: {
              userId: req.user.id,
              artistId: id
            }
          },
          select: { id: true }
        }))
      : false;

    const upcomingEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startDate,
      endsAt: event.endDate,
      venue: event.venue.name,
      region: event.venue.region,
      city: event.venue.city,
      state: event.venue.state,
      imageUrl: event.imageUrl ?? event.venue.imageUrl ?? ""
    }));

    res.json({
      item: {
        ...mapArtistPayload(artist),
        followersCount: artist._count?.followers ?? 0,
        isFollowing,
        upcomingEvents
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function followArtist(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const artistExists = await prisma.artist.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!artistExists) {
      return res.status(404).json({
        error: "artist_not_found",
        message: "Artista nao encontrado."
      });
    }

    await prisma.artistFollow.upsert({
      where: {
        userId_artistId: {
          userId: req.user.id,
          artistId: id
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        artistId: id
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function unfollowArtist(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    await prisma.artistFollow.deleteMany({
      where: {
        userId: req.user.id,
        artistId: id
      }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createArtist(req, res, next) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "forbidden",
        message: "Somente admin pode cadastrar novos artistas. Use o fluxo de reivindicacao."
      });
    }
    const data = createArtistSchema.parse(req.body);
    const slug = slugify(data.name);
    const duplicate = await prisma.artist.findFirst({
      where: {
        OR: [{ slug }, { name: data.name }]
      },
      select: { id: true }
    });

    if (duplicate) {
      return res.status(409).json({
        error: "artist_already_exists",
        message: "Ja existe um artista com esse nome."
      });
    }

    const artist = await prisma.artist.create({
      data: {
        ...data,
        slug,
        genres: data.genres.length ? data.genres : ["samba"],
        createdByUserId: req.user.id
      },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    res.status(201).json({ item: mapArtistPayload(artist) });
  } catch (error) {
    next(error);
  }
}

export async function updateArtist(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const data = updateArtistSchema.parse(req.body);
    const existing = await prisma.artist.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        accesses: { select: { userId: true, role: true, status: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({
        error: "artist_not_found",
        message: "Artista nao encontrado."
      });
    }

    if (!canManageArtist(req.user, existing)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode editar este artista."
      });
    }

    if (req.user?.role !== "admin" && Object.prototype.hasOwnProperty.call(data, "isVerified")) {
      delete data.isVerified;
    }

    if (data.name) {
      const newSlug = slugify(data.name);
      const duplicate = await prisma.artist.findFirst({
        where: {
          id: { not: id },
          OR: [{ slug: newSlug }, { name: data.name }]
        },
        select: { id: true }
      });
      if (duplicate) {
        return res.status(409).json({
          error: "artist_already_exists",
          message: "Ja existe outro artista com esse nome."
        });
      }
    }

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        ...data,
        ...(data.name ? { slug: slugify(data.name) } : {}),
        ...(data.genres ? { genres: data.genres.length ? data.genres : ["samba"] } : {})
      },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    res.json({ item: mapArtistPayload(artist) });
  } catch (error) {
    next(error);
  }
}

export async function deleteArtist(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        producerAccesses: {
          select: { producerId: true }
        },
        accesses: { select: { userId: true, role: true, status: true } },
        _count: {
          select: { events: true }
        }
      }
    });
    if (!artist) {
      return res.status(404).json({
        error: "artist_not_found",
        message: "Artista nao encontrado."
      });
    }

    if (!canManageArtist(req.user, artist)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode excluir este artista."
      });
    }

    if (artist._count.events > 0) {
      return res.status(409).json({
        error: "artist_has_events",
        message: "Nao e possivel excluir artista vinculado a eventos."
      });
    }

    await prisma.artist.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
