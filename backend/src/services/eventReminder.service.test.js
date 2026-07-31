import { describe, expect, it } from "vitest";
import { getRadarReminderSchedule } from "./eventReminder.service.js";

describe("getRadarReminderSchedule", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("agenda para três horas antes quando há antecedência", () => {
    const scheduledFor = getRadarReminderSchedule("2026-07-30T18:00:00.000Z", now);
    expect(scheduledFor?.toISOString()).toBe("2026-07-30T15:00:00.000Z");
  });

  it("devolve agora quando faltam menos de três horas", () => {
    const scheduledFor = getRadarReminderSchedule("2026-07-30T13:30:00.000Z", now);
    expect(scheduledFor?.getTime()).toBe(now.getTime());
  });

  it("não agenda eventos que já começaram", () => {
    expect(getRadarReminderSchedule("2026-07-30T11:59:00.000Z", now)).toBeNull();
  });
});
