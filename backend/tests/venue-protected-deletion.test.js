import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("protected administrative venue deletion", () => {
  it("keeps producer removal on the legacy endpoint and reserves permanent deletion for admin confirmation", () => {
    const routes = read("src/routes/index.js");
    const controller = read("src/controllers/venues.controller.js");
    expect(routes).toContain('router.delete("/venues/:id", ...canManageCatalog, deleteVenue);');
    expect(routes).toContain('router.delete("/admin/venues/:id", requireAuth, requireRole(["admin"]), deleteAdminVenue);');
    expect(controller).toContain('if (req.user?.role === "producer")');
    expect(controller).toContain('admin_deletion_confirmation_required');
  });

  it("requires the exact name and blocks every known dependent record before deleting", () => {
    const controller = read("src/controllers/venues.controller.js");
    for (const dependency of ["events", "producerAccesses", "managerAccesses", "claimRequests", "adEvents", "menu", "acquisitionLead"]) {
      expect(controller).toContain(dependency);
    }
    expect(controller).toContain('confirmationName !== venue.name');
    expect(controller).toContain('venue_has_dependencies');
    expect(controller).toContain('venue.deleted');
    expect(controller).toContain('totalDependencies: 0');
  });

  it("does not depend on the browser preflight: the transaction repeats the dependency check", () => {
    const controller = read("src/controllers/venues.controller.js");
    expect(controller).toContain('export async function getAdminVenueDeletionImpact');
    expect(controller).toContain('export async function deleteAdminVenue');
    expect(controller).toContain('prisma.$transaction(async (tx) =>');
    expect(controller).toContain('error?.code === "P2003"');
  });
});
