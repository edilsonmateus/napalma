import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildDemoEventWindow } from "./lib/demo-event-schedule.js";
import { DEMO_PRODUCER_EMAIL, loadDemoFixtureKeys, normalizeDemoIdentity } from "./lib/demo-event-fixtures.js";

const prisma = new PrismaClient();

async function recognizeLegacyDemoEvents() {
  const producer = await prisma.user.findUnique({
    where: { email: DEMO_PRODUCER_EMAIL },
    select: { id: true }
  });
  if (!producer) return 0;

  const fixtureKeys = loadDemoFixtureKeys();
  const candidates = await prisma.event.findMany({
    where: { createdByUserId: producer.id, isDemo: false },
    select: { id: true, title: true, venue: { select: { name: true } } }
  });
  const ids = candidates
    .filter((event) => fixtureKeys.has(`${normalizeDemoIdentity(event.title)}::${normalizeDemoIdentity(event.venue.name)}`))
    .map((event) => event.id);
  if (!ids.length) return 0;
  const result = await prisma.event.updateMany({
    where: { id: { in: ids }, isDemo: false },
    data: { isDemo: true }
  });
  return result.count;
}

async function main() {
  const recognized = await recognizeLegacyDemoEvents();
  const events = await prisma.event.findMany({
    where: { isDemo: true },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  const now = new Date();
  await prisma.$transaction(events.map((event, index) => {
    const { startDate, endDate } = buildDemoEventWindow(index, now);
    return prisma.event.update({
      where: { id: event.id },
      data: { startDate, endDate, status: "confirmed" }
    });
  }));

  console.log(`Eventos demo reconhecidos: ${recognized}. Datas atualizadas: ${events.length}. Eventos reais preservados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
