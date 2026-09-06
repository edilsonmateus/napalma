import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("administrative venue visibility API contract", () => {
  it("exposes a separate admin-only overview, impact and visibility surface", () => {
    const routes = read("src/routes/index.js");
    expect(routes).toContain('router.get("/admin/venues/:id/overview", requireAuth, requireRole(["admin"]), getAdminVenueOverview);');
    expect(routes).toContain('router.get("/admin/venues/:id/visibility-impact", requireAuth, requireRole(["admin"]), getAdminVenueVisibilityImpact);');
    expect(routes).toContain('router.patch("/admin/venues/:id/visibility", requireAuth, requireRole(["admin"]), updateAdminVenueVisibility);');
  });

  it("uses an expected state, allowlisted reasons, one transaction and minimal audit data", () => {
    const controller = read("src/controllers/venues.controller.js");
    expect(controller).toContain("expectedStatus: visibilityStatusSchema");
    expect(controller).toContain("visibilityReasonCodeSchema");
    expect(controller).toContain("prisma.$transaction(async (tx) =>");
    expect(controller).toContain("visibility_state_changed");
    expect(controller).toContain("venue.visibility_changed");
    expect(controller).toContain("reasonCode: payload.reasonCode || null");
  });

  it("cancels only pending future reminders and never changes program data", () => {
    const controller = read("src/controllers/venues.controller.js");
    expect(controller).toContain('status: { in: ["PENDING", "PROCESSING"] }');
    expect(controller).toContain('failureReason: "venue_visibility_paused"');
    expect(controller).not.toContain("event.update({ where: { venueId: id }");
    expect(controller).not.toContain("venueMenu.update({ where: { venueId: id }");
  });

  it("returns the Ads impact using the value produced by the grouped query", () => {
    const controller = read("src/controllers/venues.controller.js");
    expect(controller).toContain("pendingAdDeliveries: pendingDeliveries");
    expect(controller).not.toContain("    pendingAdDeliveries\n");
  });
});
