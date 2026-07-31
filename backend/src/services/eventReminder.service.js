import { EventReminderStatus, EventReminderType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { hasPushConfig, sendPushToSubscriptions } from "./push.service.js";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const CANCELLED_EVENT_STATUSES = new Set(["cancelled", "canceled"]);

export function getRadarReminderSchedule(startAt, now = new Date()) {
  const start = new Date(startAt);
  if (!Number.isFinite(start.getTime()) || start <= now) return null;
  const threeHoursBefore = new Date(start.getTime() - THREE_HOURS_MS);
  return threeHoursBefore > now ? threeHoursBefore : now;
}

function isEligibleEvent(event, now = new Date()) {
  return event && !CANCELLED_EVENT_STATUSES.has(String(event.status || "").toLowerCase()) && new Date(event.startDate) > now;
}

function eventReminderPayload(event, reminder) {
  const startsAt = new Date(event.startDate);
  const hour = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return {
    title: `${event.title} começa em 3 horas`,
    body: `Hoje, às ${hour}, no ${event.venue?.name || "local do evento"}. Veja rota, ingressos e informações.`,
    url: `/events/${event.id}?source=radar_reminder&reminderId=${reminder.id}`,
    tag: `77gira-radar-reminder-${reminder.id}`,
    eventId: event.id,
    reminderId: reminder.id,
    kind: "radar_event_reminder"
  };
}

export async function scheduleRadarEventReminder({ userId, eventId, now = new Date() }) {
  if (!env.radarEventRemindersEnabled) return { enabled: false, reminder: null, reason: "feature_disabled" };

  const [user, event] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { radarEventRemindersEnabled: true } }),
    prisma.event.findUnique({ where: { id: eventId }, include: { venue: { select: { name: true } } } })
  ]);
  if (!user?.radarEventRemindersEnabled) return { enabled: false, reminder: null, reason: "preference_disabled" };
  if (!isEligibleEvent(event, now)) return { enabled: true, reminder: null, reason: "event_not_eligible" };

  const scheduledFor = getRadarReminderSchedule(event.startDate, now);
  if (!scheduledFor) return { enabled: true, reminder: null, reason: "event_not_eligible" };
  const existing = await prisma.eventReminder.findUnique({
    where: { userId_eventId_type: { userId, eventId, type: EventReminderType.EVENT_START_3H } }
  });

  if (existing?.status === EventReminderStatus.SENT) return { enabled: true, reminder: existing, reason: "already_sent" };
  const data = {
    scheduledFor,
    eventStartSnapshot: event.startDate,
    status: EventReminderStatus.PENDING,
    sentAt: null,
    cancelledAt: null,
    failureReason: null
  };
  const reminder = existing
    ? await prisma.eventReminder.update({ where: { id: existing.id }, data })
    : await prisma.eventReminder.create({ data: { ...data, userId, eventId, type: EventReminderType.EVENT_START_3H } });
  if (scheduledFor.getTime() <= now.getTime()) {
    processDueRadarEventReminders({ now }).catch((error) => console.error("Erro ao processar lembrete imediato do Radar:", error?.message || error));
  }
  return { enabled: true, reminder, reason: scheduledFor.getTime() === now.getTime() ? "due_now" : "scheduled" };
}

export async function cancelRadarEventReminders({ userId, eventId, reason = "removed_from_radar" }) {
  return prisma.eventReminder.updateMany({
    where: { userId, eventId, status: { in: [EventReminderStatus.PENDING, EventReminderStatus.PROCESSING] } },
    data: { status: EventReminderStatus.CANCELLED, cancelledAt: new Date(), failureReason: reason }
  });
}

export async function rescheduleEventReminders(eventId, now = new Date()) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { updated: 0, cancelled: 0 };
  if (!isEligibleEvent(event, now)) {
    const result = await prisma.eventReminder.updateMany({
      where: { eventId, status: { in: [EventReminderStatus.PENDING, EventReminderStatus.PROCESSING] } },
      data: { status: EventReminderStatus.CANCELLED, cancelledAt: now, failureReason: "event_cancelled_or_started" }
    });
    return { updated: 0, cancelled: result.count };
  }
  const scheduledFor = getRadarReminderSchedule(event.startDate, now);
  const result = await prisma.eventReminder.updateMany({
    where: { eventId, status: EventReminderStatus.PENDING },
    data: { scheduledFor, eventStartSnapshot: event.startDate, failureReason: null }
  });
  if (scheduledFor?.getTime() <= now.getTime()) {
    processDueRadarEventReminders({ now }).catch((error) => console.error("Erro ao processar lembrete reprogramado do Radar:", error?.message || error));
  }
  return { updated: result.count, cancelled: 0 };
}

export async function getRadarReminderStatus(userId, eventIds = null) {
  const reminders = await prisma.eventReminder.findMany({
    where: { userId, ...(eventIds?.length ? { eventId: { in: eventIds } } : {}) },
    select: { id: true, eventId: true, scheduledFor: true, status: true, sentAt: true, failureReason: true },
    orderBy: { updatedAt: "desc" }
  });
  const preference = await prisma.user.findUnique({ where: { id: userId }, select: { radarEventRemindersEnabled: true } });
  const activeSubscriptions = await prisma.pushSubscription.count({ where: { userId, isActive: true } });
  return { enabled: Boolean(preference?.radarEventRemindersEnabled), activeSubscriptions, items: reminders };
}

export async function processDueRadarEventReminders({ now = new Date(), limit = env.radarEventReminderBatchSize } = {}) {
  if (!env.radarEventRemindersEnabled || !hasPushConfig()) return { processed: 0, sent: 0, failed: 0, skipped: true };
  const candidates = await prisma.eventReminder.findMany({
    where: { status: EventReminderStatus.PENDING, scheduledFor: { lte: now } },
    select: { id: true }, orderBy: { scheduledFor: "asc" }, take: limit
  });
  let processed = 0; let sent = 0; let failed = 0;
  for (const candidate of candidates) {
    const claim = await prisma.eventReminder.updateMany({ where: { id: candidate.id, status: EventReminderStatus.PENDING }, data: { status: EventReminderStatus.PROCESSING } });
    if (!claim.count) continue;
    processed += 1;
    try {
      const reminder = await prisma.eventReminder.findUnique({
        where: { id: candidate.id }, include: { event: { include: { venue: { select: { name: true } } } }, user: { select: { radarEventRemindersEnabled: true } } }
      });
      if (!reminder || !reminder.user.radarEventRemindersEnabled || !isEligibleEvent(reminder.event, now)) {
        await prisma.eventReminder.update({ where: { id: candidate.id }, data: { status: EventReminderStatus.CANCELLED, cancelledAt: now, failureReason: "event_or_preference_not_eligible" } });
        continue;
      }
      const result = await sendPushToSubscriptions({
        where: { userId: reminder.userId }, payload: eventReminderPayload(reminder.event, reminder), limit: 10,
        onDelivery: async ({ subscription, status, error }) => prisma.eventReminderDelivery.upsert({
          where: { reminderId_subscriptionId: { reminderId: reminder.id, subscriptionId: subscription.id } },
          update: { providerStatus: status, sentAt: status === "sent" ? now : null, failureReason: error?.message?.slice(0, 500) || null },
          create: { reminderId: reminder.id, subscriptionId: subscription.id, providerStatus: status, sentAt: status === "sent" ? now : null, failureReason: error?.message?.slice(0, 500) || null }
        })
      });
      if (result.sent > 0) {
        sent += 1;
        await prisma.eventReminder.update({ where: { id: reminder.id }, data: { status: EventReminderStatus.SENT, sentAt: now, failureReason: null } });
      } else {
        failed += 1;
        await prisma.eventReminder.update({ where: { id: reminder.id }, data: { status: EventReminderStatus.FAILED, failureReason: result.attempted ? "push_delivery_failed" : "no_active_subscription" } });
      }
    } catch (error) {
      failed += 1;
      await prisma.eventReminder.update({ where: { id: candidate.id }, data: { status: EventReminderStatus.FAILED, failureReason: String(error?.message || "reminder_processing_failed").slice(0, 500) } });
    }
  }
  return { processed, sent, failed, skipped: false };
}

export function startRadarEventReminderScheduler({ keepAlive = false } = {}) {
  if (!env.radarEventRemindersEnabled || !env.radarEventReminderSchedulerEnabled) return;
  const run = () => processDueRadarEventReminders().catch((error) => console.error("Erro no worker de lembretes Radar:", error?.message || error));
  run();
  const timer = setInterval(run, env.radarEventReminderSchedulerIntervalMs);
  if (!keepAlive) timer.unref?.();
  console.log(`Worker de lembretes Radar ativo (${env.radarEventReminderSchedulerIntervalMs}ms).`);
}
