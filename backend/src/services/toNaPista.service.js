import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hasPushConfig, sendPushToSubscriptions } from "./push.service.js";

const INITIAL_NOTIFICATION_DELAY_MS = 3 * 60 * 1000;

export class ToNaPistaServiceError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function toRadians(value) {
  return value * Math.PI / 180;
}

export function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat))
    * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCancelled(status) {
  return ["cancelled", "canceled", "cancelado"].includes(String(status || "").toLowerCase());
}

function subscriptionIdentity(session) {
  return session.userId ? { userId: session.userId } : { visitorId: session.visitorId };
}

function startsCopy(event, now) {
  if (event.startDate <= now && event.endDate >= now) return "Tá rolando agora";
  return `Começa às ${event.startDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  })}`;
}

export async function findSuggestionForSession(session, { now = new Date() } = {}) {
  const horizon = new Date(now.getTime() + env.toNaPistaHorizonMinutes * 60000);
  const delivered = await prisma.toNaPistaDelivery.findMany({
    where: { sessionId: session.id },
    select: { eventId: true }
  });
  const deliveredIds = delivered.map((item) => item.eventId);
  const events = await prisma.event.findMany({
    where: {
      endDate: { gt: now },
      startDate: { lte: horizon },
      ...(deliveredIds.length ? { id: { notIn: deliveredIds } } : {})
    },
    include: { venue: true },
    orderBy: { startDate: "asc" },
    take: 300
  });

  return events
    .filter((event) => !isCancelled(event.status))
    .map((event) => {
      const latitude = Number(event.venue?.latitude);
      const longitude = Number(event.venue?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      const distanceKm = calculateDistanceKm(session.latitude, session.longitude, latitude, longitude);
      if (distanceKm > env.toNaPistaRadiusKm) return null;
      const live = event.startDate <= now && event.endDate >= now;
      return { event, distanceKm, live, timeDelta: Math.abs(event.startDate.getTime() - now.getTime()) };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.live) - Number(a.live) || a.timeDelta - b.timeDelta || a.distanceKm - b.distanceKm)[0] || null;
}

export async function deliverToNaPistaSession({ sessionId, eventId, identities = null, now = new Date() }) {
  const session = await prisma.toNaPistaSession.findFirst({
    where: {
      id: sessionId,
      isActive: true,
      expiresAt: { gt: now },
      ...(identities?.length ? { OR: identities } : {})
    }
  });
  if (!session) throw new ToNaPistaServiceError("session_not_active", 404);
  if (
    session.notificationsSent === 0
    && now.getTime() < session.startsAt.getTime() + INITIAL_NOTIFICATION_DELAY_MS
  ) {
    throw new ToNaPistaServiceError("notification_not_ready", 409);
  }
  if (session.notificationsSent >= session.maxNotifications) {
    await prisma.toNaPistaSession.update({ where: { id: session.id }, data: { isActive: false } });
    throw new ToNaPistaServiceError("notification_limit_reached", 409);
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { venue: true } });
  if (!event) throw new ToNaPistaServiceError("event_not_found", 404);

  let delivery;
  try {
    delivery = await prisma.toNaPistaDelivery.create({ data: { sessionId: session.id, eventId: event.id } });
  } catch (error) {
    if (error?.code === "P2002") throw new ToNaPistaServiceError("event_already_delivered", 409);
    throw error;
  }

  const reserved = await prisma.toNaPistaSession.updateMany({
    where: {
      id: session.id,
      isActive: true,
      expiresAt: { gt: now },
      notificationsSent: { lt: session.maxNotifications }
    },
    data: { notificationsSent: { increment: 1 } }
  });
  if (reserved.count !== 1) {
    await prisma.toNaPistaDelivery.delete({ where: { id: delivery.id } });
    throw new ToNaPistaServiceError("notification_limit_reached", 409);
  }

  const push = await sendPushToSubscriptions({
    where: subscriptionIdentity(session),
    payload: {
      title: "Tô na Pista sugeriu:",
      body: `${event.title} no ${event.venue.name} - ${startsCopy(event, now)}`,
      url: `/events/${event.id}`,
      tag: `77gira-to-na-pista-${session.id}-${event.id}`,
      actions: [{ action: "open", title: "Partiu Agora!" }]
    },
    limit: 10
  });

  if (push.sent === 0) {
    await prisma.$transaction([
      prisma.toNaPistaDelivery.delete({ where: { id: delivery.id } }),
      prisma.toNaPistaSession.update({
        where: { id: session.id },
        data: { notificationsSent: { decrement: 1 } }
      })
    ]);
    return { delivered: false, shouldFallback: true, push, session };
  }

  const nextCount = session.notificationsSent + 1;
  const updatedSession = await prisma.toNaPistaSession.update({
    where: { id: session.id },
    data: {
      isActive: nextCount < session.maxNotifications
    }
  });
  return { delivered: true, shouldFallback: false, push, session: updatedSession };
}

export async function runToNaPistaSchedulerCycle({ now = new Date() } = {}) {
  await prisma.toNaPistaSession.updateMany({
    where: { isActive: true, expiresAt: { lte: now } },
    data: { isActive: false }
  });
  if (!hasPushConfig()) return { scanned: 0, delivered: 0, skipped: "push_not_configured" };

  const sessions = await prisma.toNaPistaSession.findMany({
    where: { isActive: true, expiresAt: { gt: now } },
    orderBy: { updatedAt: "asc" },
    take: env.toNaPistaBatchSize
  });
  let delivered = 0;
  for (const session of sessions) {
    if (session.notificationsSent >= session.maxNotifications) continue;
    try {
      const pushTarget = subscriptionIdentity(session);
      const hasSubscription = await prisma.pushSubscription.count({
        where: { isActive: true, ...pushTarget }
      });
      if (!hasSubscription) continue;
      const suggestion = await findSuggestionForSession(session, { now });
      if (!suggestion) continue;
      const result = await deliverToNaPistaSession({ sessionId: session.id, eventId: suggestion.event.id, now });
      if (result.delivered) delivered += 1;
    } catch (error) {
      if (!(error instanceof ToNaPistaServiceError)) {
        console.error("Erro no agendador Tô na Pista:", error);
      }
    }
  }
  return { scanned: sessions.length, delivered };
}

let schedulerTimer = null;
let schedulerRunning = false;

export function startToNaPistaScheduler() {
  if (!env.toNaPistaSchedulerEnabled || schedulerTimer) return null;
  const tick = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      await runToNaPistaSchedulerCycle();
    } finally {
      schedulerRunning = false;
    }
  };
  setTimeout(tick, 5000).unref?.();
  schedulerTimer = setInterval(tick, Math.max(15000, env.toNaPistaSchedulerIntervalMs));
  schedulerTimer.unref?.();
  return schedulerTimer;
}
