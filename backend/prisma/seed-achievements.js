import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const catalog = [
  {
    key: "first_radar",
    name: "No Radar",
    description: "Marcou seu primeiro samba no Radar",
    icon: "🎯",
    points: 5,
    requirement: { type: "marked_events", count: 1 }
  },
  {
    key: "samba_lover",
    name: "Sambista Raiz",
    description: "Foi em 5 sambas diferentes",
    icon: "🎵",
    points: 30,
    requirement: { type: "history_events", count: 5 }
  },
  {
    key: "pagodeiro_assumido",
    name: "Pagodeiro Assumido",
    description: "Foi em 3 pagodes",
    icon: "🎤",
    points: 20,
    requirement: { type: "event_type", eventType: "pagode", count: 3 }
  },
  {
    key: "pe_de_valsa",
    name: "Pé de Valsa",
    description: "Foi em 2 gafieiras",
    icon: "💃",
    points: 20,
    requirement: { type: "event_type", eventType: "gafieira", count: 2 }
  }
];

async function ensureCatalog() {
  for (const item of catalog) {
    await prisma.achievement.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        description: item.description,
        icon: item.icon,
        points: item.points,
        requirement: item.requirement
      },
      create: item
    });
  }
}

function buildEventTypeCounter(events) {
  return events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
}

async function backfillUnlocks() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const achievements = await prisma.achievement.findMany({
    select: { id: true, requirement: true }
  });

  for (const user of users) {
    const [radarCount, historyRows] = await Promise.all([
      prisma.markedEvent.count({ where: { userId: user.id } }),
      prisma.userEventHistory.findMany({
        where: { userId: user.id },
        select: {
          event: {
            select: { type: true }
          }
        }
      })
    ]);

    const historyCount = historyRows.length;
    const typeCounter = buildEventTypeCounter(historyRows.map((row) => row.event));

    for (const achievement of achievements) {
      const req = achievement.requirement;
      if (!req?.type) continue;

      let unlocked = false;
      if (req.type === "marked_events") unlocked = radarCount >= Number(req.count || 0);
      if (req.type === "history_events") unlocked = historyCount >= Number(req.count || 0);
      if (req.type === "event_type") {
        const current = Number(typeCounter[String(req.eventType || "")] || 0);
        unlocked = current >= Number(req.count || 0);
      }
      if (!unlocked) continue;

      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId: user.id,
            achievementId: achievement.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          achievementId: achievement.id
        }
      });
    }
  }
}

async function main() {
  await ensureCatalog();
  await backfillUnlocks();
  console.log("Achievements synced without reset.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
