import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDemoEventWindow, DEMO_DAY_OFFSETS } from "../prisma/lib/demo-event-schedule.js";
import { loadDemoFixtureKeys } from "../prisma/lib/demo-event-fixtures.js";

const backendRoot = path.resolve(import.meta.dirname, "..");

describe("safe demo event refresh", () => {
  it("keeps the fixture schedule inside the next five days", () => {
    const now = new Date("2026-07-20T10:30:00-03:00");
    const windows = DEMO_DAY_OFFSETS.map((_, index) => buildDemoEventWindow(index, now));
    expect(windows[0].startDate.getDate()).toBe(20);
    expect(windows.at(-1).startDate.getDate()).toBe(24);
    expect(windows.every(({ startDate, endDate }) => endDate > startDate)).toBe(true);
  });

  it("recognizes every event/venue pair from the production fixture", () => {
    const keys = loadDemoFixtureKeys({ cwd: backendRoot });
    expect(keys.size).toBe(13);
    expect(keys).toContain("samba-da-elis::todos-os-santos");
    expect(keys).toContain("samba-da-treze::dois-dois");
  });

  it("marks new seed fixtures and refreshes only explicitly marked events", () => {
    const schema = fs.readFileSync(path.join(backendRoot, "prisma", "schema.prisma"), "utf8");
    const seed = fs.readFileSync(path.join(backendRoot, "prisma", "seed.js"), "utf8");
    const refresh = fs.readFileSync(path.join(backendRoot, "prisma", "refresh-demo-event-dates.js"), "utf8");
    const legacyRefresh = fs.readFileSync(path.join(backendRoot, "prisma", "refresh-event-dates.js"), "utf8");
    const packageJson = JSON.parse(fs.readFileSync(path.join(backendRoot, "package.json"), "utf8"));
    expect(schema).toContain("isDemo               Boolean    @default(false)");
    expect(seed).toContain("isDemo: true");
    expect(refresh).toContain("where: { isDemo: true }");
    expect(refresh).not.toContain("deleteMany");
    expect(legacyRefresh).toContain('import "./refresh-demo-event-dates.js"');
    expect(legacyRefresh).not.toContain("findMany({\n    orderBy");
    expect(packageJson.scripts["prisma:refresh-demo-events"]).toContain("prisma generate &&");
  });
});
