import { prisma } from "../lib/prisma.js";

export async function listMyAchievements(req, res, next) {
  try {
    const [radarCount, historyCount, historyByType] = await Promise.all([
      prisma.markedEvent.count({ where: { userId: req.user.id } }),
      prisma.userEventHistory.count({ where: { userId: req.user.id } }),
      prisma.userEventHistory.groupBy({
        by: ["eventId"],
        where: { userId: req.user.id }
      })
    ]);

    const eventIds = historyByType.map((item) => item.eventId);
    const events = eventIds.length
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, type: true }
        })
      : [];

    const typeCounter = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const items = await prisma.achievement.findMany({
      include: {
        users: {
          where: { userId: req.user.id },
          select: { unlockedAt: true }
        }
      },
      orderBy: [{ points: "asc" }, { name: "asc" }]
    });

    function getProgress(requirement) {
      if (!requirement?.type) return null;

      if (requirement.type === "marked_events") {
        const target = Number(requirement.count || 0);
        return { current: Math.min(radarCount, target), target };
      }

      if (requirement.type === "history_events") {
        const target = Number(requirement.count || 0);
        return { current: Math.min(historyCount, target), target };
      }

      if (requirement.type === "event_type") {
        const target = Number(requirement.count || 0);
        const current = Number(typeCounter[String(requirement.eventType || "")] || 0);
        return { current: Math.min(current, target), target };
      }

      return null;
    }

    res.json({
      items: items.map((achievement) => ({
        id: achievement.id,
        key: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        progress: getProgress(achievement.requirement),
        unlocked: achievement.users.length > 0,
        unlockedAt: achievement.users[0]?.unlockedAt ?? null
      }))
    });
  } catch (error) {
    next(error);
  }
}
