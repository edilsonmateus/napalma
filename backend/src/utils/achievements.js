import { prisma } from "../lib/prisma.js";

async function hasAchievement(userId, achievementId) {
  const existing = await prisma.userAchievement.findFirst({
    where: { userId, achievementId },
    select: { id: true }
  });
  return Boolean(existing);
}

async function unlockAchievement(userId, achievementId) {
  if (await hasAchievement(userId, achievementId)) return false;
  await prisma.userAchievement.create({
    data: { userId, achievementId }
  });
  return true;
}

async function evaluateRequirement(userId, requirement) {
  if (!requirement?.type) return false;

  if (requirement.type === "marked_events") {
    const total = await prisma.markedEvent.count({ where: { userId } });
    return total >= Number(requirement.count || 0);
  }

  if (requirement.type === "history_events") {
    const total = await prisma.userEventHistory.count({ where: { userId } });
    return total >= Number(requirement.count || 0);
  }

  if (requirement.type === "event_type") {
    const total = await prisma.userEventHistory.count({
      where: {
        userId,
        event: {
          type: String(requirement.eventType || "")
        }
      }
    });
    return total >= Number(requirement.count || 0);
  }

  return false;
}

export async function refreshUserAchievements(userId) {
  const achievements = await prisma.achievement.findMany({
    select: { id: true, key: true, name: true, icon: true, requirement: true }
  });

  const unlockedItems = [];
  for (const achievement of achievements) {
    const shouldUnlock = await evaluateRequirement(userId, achievement.requirement);
    if (!shouldUnlock) continue;
    const unlockedNow = await unlockAchievement(userId, achievement.id);
    if (unlockedNow) {
      unlockedItems.push({
        id: achievement.id,
        key: achievement.key,
        name: achievement.name,
        icon: achievement.icon
      });
    }
  }

  return unlockedItems;
}
