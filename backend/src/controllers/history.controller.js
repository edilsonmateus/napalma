import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { refreshUserAchievements } from "../utils/achievements.js";

const eventIdSchema = z.object({
  eventId: z.string().uuid()
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

export async function listMyHistory(req, res, next) {
  try {
    const items = await prisma.userEventHistory.findMany({
      where: { userId: req.user.id },
      include: {
        event: {
          include: {
            venue: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ items: items.map(mapHistoryEntry) });
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
