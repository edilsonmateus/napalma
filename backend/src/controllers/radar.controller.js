import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshUserAchievements } from "../utils/achievements.js";
import { formatPriceLabel, formatPriceSecondaryLabel } from "../utils/price.js";
import { cancelRadarEventReminders, scheduleRadarEventReminder } from "../services/eventReminder.service.js";

const eventIdSchema = z.object({
  eventId: z.string().uuid()
});

function mapRadarEvent(markedEvent) {
  const event = markedEvent.event;
  return {
    id: event.id,
    artistId: event.artists[0]?.artist.id ?? null,
    title: event.title,
    artist: event.artists[0]?.artist.name ?? "",
    artistVerified: Boolean(event.artists[0]?.artist?.isVerified),
    venue: event.venue.name,
    region: event.venue.region,
    type: event.type,
    tags: event.tags ?? [],
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

    let reminder = null;
    try {
      reminder = await scheduleRadarEventReminder({ userId: req.user.id, eventId });
    } catch (reminderError) {
      // Lembretes sao opcionais e nunca podem impedir o salvamento no Radar.
      console.warn("Nao foi possivel programar lembrete do Radar:", reminderError?.message || reminderError);
    }
    res.status(200).json({ unlockedAchievements, reminder: reminder?.reminder ? { status: reminder.reminder.status, scheduledFor: reminder.reminder.scheduledFor } : null, reminderReason: reminder?.reason || "unavailable" });
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
    await cancelRadarEventReminders({ userId: req.user.id, eventId }).catch((error) => {
      console.warn("Nao foi possivel cancelar lembrete do Radar:", error?.message || error);
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
