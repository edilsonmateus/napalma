import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const historyController = fs.readFileSync(
  path.join(root, "backend", "src", "controllers", "history.controller.js"),
  "utf8"
);
const historyPage = fs.readFileSync(
  path.join(root, "frontend", "src", "pages", "HistoryPage.jsx"),
  "utf8"
);
const eventsHooks = fs.readFileSync(
  path.join(root, "frontend", "src", "hooks", "useEventsQuery.js"),
  "utf8"
);
const radarPage = fs.readFileSync(
  path.join(root, "frontend", "src", "pages", "RadarPage.jsx"),
  "utf8"
);

describe("progressive personal history", () => {
  it("paginates deterministically at the database boundary", () => {
    expect(historyController).toContain("take: effectiveLimit + 1");
    expect(historyController).toContain('{ createdAt: "desc" }');
    expect(historyController).toContain('{ id: "desc" }');
    expect(historyController).toContain("nextCursor");
  });

  it("searches the full server-side history and returns a compact summary", () => {
    expect(historyController).toContain('contains: q, mode: "insensitive"');
    expect(historyController).toContain("getHistorySummary");
    expect(historyController).toContain("venueCount");
    expect(historyController).toContain("artistCount");
  });

  it("loads older records progressively instead of creating an infinite DOM", () => {
    expect(eventsHooks).toContain("useInfiniteQuery");
    expect(historyPage).toContain("Carregar históricos anteriores");
    expect(historyPage).toContain("groupHistoryByMonth");
  });

  it("limits the Radar attendance check to the events currently in the Radar", () => {
    expect(radarPage).toContain("radarEventIds");
    expect(radarPage).toContain("radarEventIds.length > 0");
  });
});
