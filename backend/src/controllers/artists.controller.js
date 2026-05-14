import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageArtist } from "../utils/ownership.js";

const querySchema = z.object({
  q: z.string().trim().min(1).optional()
});

const idSchema = z.object({
  id: z.string().uuid()
});

const createArtistSchema = z.object({
  name: z.string().trim().min(2),
  bio: z.string().trim().optional(),
  imageUrl: z.string().url().optional(),
  genres: z.array(z.string().trim().min(1)).default(["samba"]),
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
    imageUrl: artist.imageUrl ?? "",
    genres: artist.genres ?? [],
    spotifyUrl: artist.spotifyUrl ?? "",
    youtubeUrl: artist.youtubeUrl ?? "",
    instagramUrl: artist.instagramUrl ?? "",
    eventsCount: artist._count?.events ?? 0
  };
}

export async function listArtists(req, res, next) {
  try {
    const { q } = querySchema.parse(req.query);
    const items = await prisma.artist.findMany({
      where: q
        ? {
            OR: [{ name: { contains: q, mode: "insensitive" } }, { genres: { hasSome: [q.toLowerCase()] } }]
          }
        : undefined,
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

    res.json({ item: mapArtistPayload(artist) });
  } catch (error) {
    next(error);
  }
}

export async function createArtist(req, res, next) {
  try {
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
      select: { id: true, createdByUserId: true }
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
