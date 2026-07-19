import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Acquisition intelligence foundation", () => {
  it("preserves status transitions as immutable history", () => {
    const schema = read("backend/prisma/schema.prisma");
    const controller = read("backend/src/controllers/acquisition.controller.js");
    expect(schema).toContain("model AcquisitionStatusHistory");
    expect(schema).toContain("@@index([leadId, changedAt])");
    expect(controller).toContain("acquisitionStatusHistory.create");
    expect(controller).toContain("fromStatus: current.status");
    expect(controller).toContain("toStatus: payload.status");
  });

  it("keeps analytics and timeline protected by the existing admin acquisition guard", () => {
    const routes = read("backend/src/routes/index.js");
    expect(routes).toContain('router.get("/acquisition/analytics", ...canManageAcquisition, getAcquisitionAnalytics)');
    expect(routes).toContain('router.get("/acquisition/leads/:id/timeline", ...canManageAcquisition, getAcquisitionLeadTimeline)');
  });

  it("supports the approved operating windows and cadence signals", () => {
    const controller = read("backend/src/controllers/acquisition.controller.js");
    expect(controller).toContain("[1, 7, 30, 90, 120].includes(value)");
    expect(controller).toContain("averageFirstContactHours");
    expect(controller).toContain("idleDays >= 7");
    expect(controller).toContain("statusDistribution");
  });
});
