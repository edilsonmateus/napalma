import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("administrative venue list integration", () => {
  it("exposes the visibility field only to managed data and gives admin a detail entry", () => {
    const controller = read("backend/src/controllers/venues.controller.js");
    const page = read("frontend/src/pages/VenuesAdminPage.jsx");
    expect(controller).toContain("visibilityStatus: venue.visibilityStatus");
    expect(controller).toContain("function mapPublicVenuePayload");
    expect(page).toContain("Ver casa");
    expect(page).toContain("venueVisibilityFilter");
    expect(page).toContain("/settings/venues/${venue.id}");
  });

  it("does not reuse the producer removal action as an administrative delete shortcut", () => {
    const page = read("frontend/src/pages/VenuesAdminPage.jsx");
    expect(page).toContain('{isProducer ?<button className="chip" onClick={() => handleVenueDelete(venue.id)}');
    expect(page).not.toContain('{isProducer ?"Remover da carteira" : "Excluir"}');
  });

  it("accepts an edit query only for a real admin venue and clears it after processing", () => {
    const page = read("frontend/src/pages/VenuesAdminPage.jsx");
    expect(page).toContain('searchParams.get("edit")');
    expect(page).toContain('const venue = venues.find((item) => item.id === requestedVenueId);');
    expect(page).toContain('nextParams.delete("edit")');
    expect(page).toContain("handleVenueEdit(venue).finally");
  });
});
