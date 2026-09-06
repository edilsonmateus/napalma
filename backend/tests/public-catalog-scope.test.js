import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const eventsController = read("backend/src/controllers/events.controller.js");
const explore = read("frontend/src/pages/ExplorePage.jsx");
const eventDetail = read("frontend/src/pages/EventDetailPage.jsx");
const pelaHora = read("frontend/src/pages/PelaHoraPage.jsx");
const venueDetail = read("frontend/src/pages/VenueDetailFlowPage.jsx");

describe("public catalog scope", () => {
  it("keeps the public event catalog unrestricted for professional accounts", () => {
    expect(eventsController).toContain('scope: z.enum(["managed", "public"]).optional()');
    expect(eventsController).toContain('const useManagedScope = ["admin", "producer", "venue_manager"].includes(role) && scope !== "public";');
    expect(eventsController).toContain('const isProducer = req.user?.role === "producer" && useManagedScope;');
    expect(eventsController).toContain('const includeDraftsSafe = canIncludeDrafts && useManagedScope ? includeDrafts : false;');
  });

  it("uses the public catalog on every discovery surface", () => {
    expect(explore).toContain('scope: "public"');
    expect(explore).toContain("useEventsQuery(\n    publicCatalogFilters");
    expect(explore).toContain("useVenuesQuery(\n    publicCatalogFilters");
    expect(eventDetail).toContain('useEventsQuery({ scope: "public" })');
    expect(pelaHora).toContain('useEventsQuery({ scope: "public" })');
    expect(venueDetail).toContain('useVenuesQuery({ scope: "public" })');
    expect(venueDetail).toContain('useEventsQuery({ venueId, scope: "public" })');
  });
});
