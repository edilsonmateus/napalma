import { env } from "../src/config/env.js";
import { startRadarEventReminderScheduler } from "../src/services/eventReminder.service.js";

if (!env.radarEventRemindersEnabled) {
  console.warn("RADAR_EVENT_REMINDERS_ENABLED nao esta ativo; worker encerrado.");
  process.exit(0);
}

startRadarEventReminderScheduler({ keepAlive: true });
