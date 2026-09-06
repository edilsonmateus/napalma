import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("public venue visibility contract", () => {
  it("keeps public catalog filtering on the server and removes operational contacts", () => {
    const venues = read("src/controllers/venues.controller.js");
    expect(venues).toContain("function mapPublicVenuePayload");
    expect(venues).toContain("contactName,");
    expect(venues).toContain("contactPhone,");
    expect(venues).toContain("filters.push(publicVenueWhere())");
    expect(venues).toContain("!isVenuePubliclyEligible(venue)");
  });

  it("covers direct event access, discovery surfaces and menu interactions", () => {
    const events = read("src/controllers/events.controller.js");
    const menus = read("src/controllers/venueMenus.controller.js");
    expect(events).toContain('venueScope.visibilityStatus = "published"');
    expect(events).toContain("!isVenuePubliclyEligible(event.venue)");
    expect(menus).toContain("venue: publicVenueRelationWhere()");
  });

  it("does not leave public auxiliary surfaces outside the same visibility rule", () => {
    const epk = read("src/controllers/artistEpk.controller.js");
    const pelaHora = read("src/controllers/pelaHora.controller.js");
    const radar = read("src/controllers/radar.controller.js");
    const reminders = read("src/services/eventReminder.service.js");
    const ads = read("src/controllers/ads.controller.js");
    expect(epk).toContain("venue: publicVenueRelationWhere()");
    expect(pelaHora).toContain("isVenuePubliclyEligible(row.event?.venue)");
    expect(radar).toContain("venue: publicVenueRelationWhere()");
    expect(reminders).toContain("isVenuePubliclyEligible(event.venue)");
    expect(ads).toContain("isPublicDeliveryVenue");
  });
});
