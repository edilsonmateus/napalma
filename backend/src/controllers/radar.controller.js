import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshUserAchievements } from "../utils/achievements.js";

const eventIdSchema = z.object({
  eventId: z.string().uuid()
});

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

function mapRadarEvent(markedEvent) {
  const event = markedEvent.event;
  return {
    id: event.id,
    artistId: event.artists[0]?.artist.id ?? null,
    title: event.title,
    artist: event.artists[0]?.artist.name ?? "Artista NaPalma",
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: event.venue.name,
    region: event.venue.region,
    type: event.type,
    startsAt: event.startDate,
    priceLabel: formatPriceLabel(event.priceMin, event.priceMax, event.ticketType),
    priceSecondaryLabel: formatPriceSecondaryLabel(event),
    imageUrl: event.imageUrl ?? event.venue.imageUrl ?? "",
    markedAt: markedEvent.createdAt
  };
}

export async function listMyRadar(req, res, next) {
  try {
    const items = await prisma.markedEvent.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            venue: true,
            artists: {
              include: { artist: true },
              orderBy: { order: "asc" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ items: items.map(mapRadarEvent) });
  } catch (error) {
    next(error);
  }
}

export async function markEventInRadar(req, res, next) {
  try {
    const { eventId } = eventIdSchema.parse(req.params);

    const eventExists = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true }
    });

    if (!eventExists) {
      return res.status(404).json({
        error: "event_not_found",
        message: "Evento nao encontrado."
      });
    }

    await prisma.markedEvent.upsert({
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

export async function unmarkEventFromRadar(req, res, next) {
  try {
    const { eventId } = eventIdSchema.parse(req.params);

    await prisma.markedEvent.deleteMany({
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
