import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { EventReminderStatus } from "@prisma/client";
import { getRadarReminderStatus, scheduleRadarEventReminder } from "../services/eventReminder.service.js";

const preferenceSchema = z.object({ enabled: z.boolean() });
const reminderIdSchema = z.object({ reminderId: z.string().uuid() });

export async function getMyRadarReminderStatus(req, res, next) {
  try {
    const eventIds = String(req.query.eventIds || "").split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    res.json(await getRadarReminderStatus(req.user.id, eventIds.length ? eventIds : null));
  } catch (error) { next(error); }
}

export async function updateMyRadarReminderPreference(req, res, next) {
  try {
    const { enabled } = preferenceSchema.parse(req.body || {});
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { radarEventRemindersEnabled: enabled }, select: { radarEventRemindersEnabled: true } });
    if (enabled) {
      const savedEvents = await prisma.markedEvent.findMany({ where: { userId: req.user.id }, select: { eventId: true } });
      await Promise.allSettled(savedEvents.map(({ eventId }) => scheduleRadarEventReminder({ userId: req.user.id, eventId })));
    } else {
      await prisma.eventReminder.updateMany({
        where: { userId: req.user.id, status: { in: [EventReminderStatus.PENDING, EventReminderStatus.PROCESSING] } },
        data: { status: EventReminderStatus.CANCELLED, cancelledAt: new Date(), failureReason: "preference_disabled" }
      });
    }
    res.json({ enabled: user.radarEventRemindersEnabled });
  } catch (error) { next(error); }
}

export async function trackRadarReminderClick(req, res, next) {
  try {
    const { reminderId } = reminderIdSchema.parse(req.params);
    const reminder = await prisma.eventReminder.findFirst({ where: { id: reminderId, userId: req.user.id }, select: { id: true } });
    if (!reminder) return res.status(404).json({ error: "reminder_not_found" });
    await prisma.eventReminderDelivery.updateMany({ where: { reminderId, clickedAt: null }, data: { clickedAt: new Date() } });
    res.json({ ok: true });
  } catch (error) { next(error); }
}
