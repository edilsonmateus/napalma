import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Venue Menu foundation", () => {
  it("keeps menu and interactions separate from Radar and advertiser wallet", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("model VenueMenu {");
    expect(schema).toContain("model VenueMenuItem {");
    expect(schema).toContain("model VenueMenuInteraction {");
    expect(schema).not.toContain("model VenueAdRestriction {");
    expect(schema).toContain("adInventoryAcceptedAt");
    expect(schema).toContain("adInventoryPolicyVersion");
    expect(schema).not.toContain("venueMenuInteractions MarkedEvent");
    expect(schema).toContain("venue_menu_sponsor");
  });

  it("enforces ownership, controlled vocabularies, limits and audit trail", () => {
    const controller = read("src/controllers/venueMenus.controller.js");
    expect(controller).toContain("canManageVenue(req.user, venue)");
    expect(controller).toContain("MENU_CATEGORIES");
    expect(controller).toContain("activeCount >= 30");
    expect(controller).toContain("venue_menu_item.created");
    expect(controller).toContain("venue_menu_item.restored");
    expect(controller).toContain("venue_menu_items.imported");
    expect(controller).toContain("venue_menu.ad_inventory_terms_accepted");
    expect(controller).toContain("ad_inventory_terms_required");
    expect(controller).toContain('status: "published", adInventoryAcceptedAt: { not: null }');
    expect(controller).toContain("existingItems.length + items.length > 30");
    expect(controller).toContain("userId_itemId_type");
  });

  it("keeps archived items recoverable and validates spreadsheet batches on the server", () => {
    const controller = read("src/controllers/venueMenus.controller.js");
    const routes = read("src/routes/index.js");
    expect(controller).toContain("previousStatus: existing.status");
    expect(controller).toContain('existing.menu.status === "published" ? "published" : "draft"');
    expect(controller).toContain("data: { status: restoreStatus, archivedAt: null }");
    expect(controller).toContain("duplicate_menu_item");
    expect(routes).toContain('/venues/:id/menu/items/import');
    expect(routes).toContain('/venues/:id/menu/items/:itemId/restore');
  });

  it("prioritizes contextual sponsorship without venue-controlled brand restrictions", () => {
    const ads = read("src/controllers/ads.controller.js");
    expect(ads).not.toContain("respectsVenueCommercialRestrictions");
    expect(ads).not.toContain("venueAdRestriction");
    expect(ads).toContain("venueCampaignPrecedence");
    expect(ads).toContain("ADS_MENU_SPONSOR_ENABLED");
  });
});
