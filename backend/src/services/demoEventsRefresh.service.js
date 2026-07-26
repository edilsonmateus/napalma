import { prisma } from "../lib/prisma.js";
import { buildDemoEventWindow } from "../../prisma/lib/demo-event-schedule.js";
import {
  DEMO_PRODUCER_EMAIL,
  loadDemoFixtureKeys,
  normalizeDemoIdentity
} from "../../prisma/lib/demo-event-fixtures.js";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let lastRefreshDayKey = null;
let refreshScheduler = null;

function getSaoPauloDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

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

/**
 * Keeps only the documented demonstration fixture on a rolling five-day
 * calendar. It never creates, deletes, or changes events outside that fixture.
 */
export async function refreshDemoEventDates({ force = false, now = new Date() } = {}) {
  const dayKey = getSaoPauloDayKey(now);
  if (!force && lastRefreshDayKey === dayKey) {
    return { skipped: true, recognized: 0, updated: 0 };
  }

  const recognized = await recognizeLegacyDemoEvents();
  const events = await prisma.event.findMany({
    where: { isDemo: true },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: { id: true }
  });

  if (events.length > 0) {
    await prisma.$transaction(events.map((event, index) => {
      const { startDate, endDate } = buildDemoEventWindow(index, now);
      return prisma.event.update({
        where: { id: event.id },
        data: { startDate, endDate, status: "confirmed" }
      });
    }));
  }

  lastRefreshDayKey = dayKey;
  return { skipped: false, recognized, updated: events.length };
}

export function startDemoEventRefreshScheduler() {
  if (refreshScheduler) return;
  refreshScheduler = setInterval(() => {
    refreshDemoEventDates()
      .then((result) => {
        if (!result.skipped) {
          console.log(`Agenda demo atualizada: ${result.updated} eventos; ${result.recognized} reconhecidos.`);
        }
      })
      .catch((error) => console.error("Erro ao atualizar agenda demo:", error));
  }, CHECK_INTERVAL_MS);
  refreshScheduler.unref?.();
}
