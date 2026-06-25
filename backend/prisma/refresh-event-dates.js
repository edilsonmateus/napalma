import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dayOffsets = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];
const startTimes = [
  [14, 0],
  [18, 0],
  [20, 0],
  [22, 0],
  [13, 0],
  [18, 30],
  [21, 0],
  [16, 0],
  [20, 0],
  [23, 0],
  [15, 30],
  [21, 30],
  [22, 0]
];
const durationsMinutes = [180, 180, 180, 180, 180, 210, 180, 180, 180, 180, 150, 180, 120];

function buildDate(offsetDays, hours, minutes) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function main() {
  const events = await prisma.event.findMany({
    orderBy: [{ startDate: "asc" }, { title: "asc" }],
    select: { id: true, title: true }
  });

  for (const [index, event] of events.entries()) {
    const [hours, minutes] = startTimes[index % startTimes.length];
    const startDate = buildDate(dayOffsets[index % dayOffsets.length], hours, minutes);
    const endDate = new Date(startDate.getTime() + durationsMinutes[index % durationsMinutes.length] * 60_000);

    await prisma.event.update({
      where: { id: event.id },
      data: { startDate, endDate, status: "confirmed" }
    });
  }

  console.log(`Datas atualizadas para ${events.length} eventos existentes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
