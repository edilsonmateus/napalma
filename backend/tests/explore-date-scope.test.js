import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  addCalendarDays,
  exploreScopeLabel,
  getUpcomingWeekendRange,
  groupExploreEventRows,
  isEventInExploreScope,
  saoPauloDateKey,
  saoPauloHour
} from "../../frontend/src/utils/exploreDateScope.js";

describe("Explore calendar scopes", () => {
  it.each([
    ["segunda", "2026-09-07T15:00:00.000Z", "2026-09-11", "2026-09-13"],
    ["quinta", "2026-09-10T15:00:00.000Z", "2026-09-11", "2026-09-13"],
    ["sexta", "2026-09-11T15:00:00.000Z", "2026-09-11", "2026-09-13"],
    ["sábado", "2026-09-12T15:00:00.000Z", "2026-09-11", "2026-09-13"],
    ["domingo", "2026-09-13T15:00:00.000Z", "2026-09-11", "2026-09-13"]
  ])("resolves the relevant weekend on %s", (_label, now, startKey, endKey) => {
    expect(getUpcomingWeekendRange(now)).toEqual({ startKey, endKey });
  });

  it("keeps Semana through the seventh following calendar day", () => {
    const now = "2026-09-08T15:00:00.000Z";
    expect(isEventInExploreScope("2026-09-15T23:30:00-03:00", "semana", now)).toBe(true);
    expect(isEventInExploreScope("2026-09-16T00:01:00-03:00", "semana", now)).toBe(false);
    expect(addCalendarDays("2026-09-08", 7)).toBe("2026-09-15");
  });

  it("uses São Paulo boundaries even when UTC is already on the next day", () => {
    const now = "2026-09-11T01:30:00.000Z";
    expect(saoPauloDateKey(now)).toBe("2026-09-10");
    expect(saoPauloHour(now)).toBe("22");
    expect(isEventInExploreScope("2026-09-11T02:30:00.000Z", "fim_de_semana", now)).toBe(false);
    expect(isEventInExploreScope("2026-09-11T03:30:00.000Z", "fim_de_semana", now)).toBe(true);
  });

  it("provides the three user-facing labels", () => {
    expect(exploreScopeLabel("hoje")).toBe("Hoje");
    expect(exploreScopeLabel("semana")).toBe("Semana");
    expect(exploreScopeLabel("fim_de_semana")).toBe("Fim de semana");
  });

  it("keeps every eligible day in the timeline and limits only inside a day", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "../frontend/src/pages/ExplorePage.jsx"),
      "utf8"
    );

    expect(source).not.toContain("eventRows.slice(0, limit)");
    expect(source).not.toContain("const canLoadMore = false");
    expect(source).toContain("groupExploreEventRows(eventRows, expandedDayKeys, EVENTS_PER_DAY)");
    expect(source).toContain("Ver mais neste dia");
  });

  it("limits a busy day without removing later days", () => {
    const rows = [
      ...Array.from({ length: 9 }, (_, index) => ({
        event: { id: `weekday-${index}`, startsAt: `2026-09-10T${String(12 + index).padStart(2, "0")}:00:00-03:00` }
      })),
      { event: { id: "friday", startsAt: "2026-09-11T20:00:00-03:00" } },
      { event: { id: "saturday", startsAt: "2026-09-12T20:00:00-03:00" } }
    ];

    const groups = groupExploreEventRows(rows, new Set(), 8);
    expect(groups.map((group) => group.key)).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    expect(groups[0]).toMatchObject({ hiddenCount: 1 });
    expect(groups[0].visibleItems).toHaveLength(8);
    expect(groups[1].visibleItems).toHaveLength(1);
    expect(groups[2].visibleItems).toHaveLength(1);

    const expanded = groupExploreEventRows(rows, new Set(["2026-09-10"]), 8);
    expect(expanded[0].visibleItems).toHaveLength(9);
    expect(expanded[0].hiddenCount).toBe(0);
  });

  it("preserves old preferences and isolates immediate recommendations from period filters", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "../frontend/src/pages/ExplorePage.jsx"),
      "utf8"
    );

    expect(source).toContain('["hoje", "semana", "fim_de_semana"].includes(parsed.timeScope)');
    expect(source).not.toContain("limit: Number(parsed.limit || 8)");
    expect(source).toMatch(/const onTrackRecommendations[\s\S]*?return baseEventRows/);
    expect(source).toContain('trackAnalyticsEvent("time_scope_filter"');
  });
});
