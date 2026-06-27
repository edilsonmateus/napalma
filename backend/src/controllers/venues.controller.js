import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canManageVenue } from "../lib/access.control.js";

const querySchema = z.object({
  region: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  scope: z.enum(["managed", "public"]).optional()
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
  openDays: z.array(z.string().trim().min(2)).default([])
});

const updateVenueSchema = createVenueSchema.partial();

const idSchema = z.object({
  id: z.string().uuid()
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
    openDays: venue.openDays ?? [],
    eventsCount: venue._count?.events ?? 0
  };
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
        }
      }
    });

    if (!venue) {
      return res.status(404).json({
        error: "venue_not_found",
        message: "Casa de samba nao encontrada."
      });
    }

    if ((req.user?.role === "producer" || req.user?.role === "venue_manager") && !canManageVenue(req.user, venue)) {
      return res.status(403).json({
        error: "forbidden",
        message: "Voce nao pode acessar esta casa."
      });
    }

    res.json({ item: mapVenuePayload(venue) });
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
    const useManagedScope = scope !== "public";

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

    const items = await prisma.venue.findMany({
      where: filters.length ? { AND: filters } : undefined,
      include: {
        _count: {
          select: { events: true }
        }
      },
      orderBy: [{ region: "asc" }, { name: "asc" }]
    });

    res.json({ items: items.map(mapVenuePayload) });
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

    const venue = await prisma.venue.create({
      data: {
        ...data,
        ...buildVenueGrammarData(data),
        ...buildVenueAnalyticsData(data),
        slug: baseSlug,
        createdByUserId: req.user.id
      },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    res.status(201).json({ item: mapVenuePayload(venue) });
  } catch (error) {
    next(error);
  }
}

export async function updateVenue(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const data = updateVenueSchema.parse(req.body);

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
    if (req.user?.role === "producer") {
      return res.status(403).json({
        error: "admin_approval_required",
        message: "Edicoes de casa por este perfil exigem aprovacao do admin."
      });
    }

    if (data.name) {
      const duplicate = await prisma.venue.findFirst({
        where: {
          id: { not: id },
          OR: [{ name: data.name }, { slug: slugify(data.name) }]
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

    const venue = await prisma.venue.update({
      where: { id },
      data: {
        ...(() => {
          const {
            analyticsTier,
            analyticsAccessSource,
            analyticsAccessUntil,
            ...safeData
          } = data;
          return {
            ...safeData,
            ...buildVenueGrammarData(safeData),
            ...(req.user?.role === "admin"
              ? buildVenueAnalyticsData({ analyticsTier, analyticsAccessSource, analyticsAccessUntil })
              : {})
          };
        })(),
        ...(data.name ? { slug: slugify(data.name) } : {})
      },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    res.json({ item: mapVenuePayload(venue) });
  } catch (error) {
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
