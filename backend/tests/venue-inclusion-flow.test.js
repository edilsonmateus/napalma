import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const claims = read("backend/src/controllers/claims.controller.js");
const access = read("backend/src/services/claimAccess.service.js");
const legal = read("backend/src/services/claimLegalWorkflow.service.js");
const visibility = read("backend/src/services/venueVisibility.service.js");
const directory = read("frontend/src/pages/VenueClaimDirectoryPage.jsx");
const operations = read("frontend/src/pages/OperationsCenterPage.jsx");
const venueAdmin = read("frontend/src/pages/VenuesAdminPage.jsx");

describe("venue inclusion and multi-venue flow", () => {
  it("creates an internal request instead of falling back to email", () => {
    expect(directory).toContain('requestType: "venue_inclusion"');
    expect(directory).toContain("Solicitar inclusão de casa");
    expect(directory).not.toContain("mailto:77giramundo@gmail.com?subject=Solicitação de inclusão de casa");
  });

  it("forces Operations to resolve the request without publishing automatically", () => {
    expect(claims).toContain("resolveVenueInclusion");
    expect(operations).toContain("Criar novo rascunho interno");
    expect(operations).toContain("Vincular a uma casa existente");
    expect(visibility).toContain("USER_INCLUSION");
  });

  it("keeps the formal signature between eligibility and access", () => {
    expect(legal).toContain('"venue_inclusion"');
    expect(access).toContain('["ownership", "team_access", "venue_inclusion"]');
    expect(claims).toContain("claimRequiresFormalSignature(claimForDecision)");
  });

  it("isolates unit-specific agenda and analytics by venue id", () => {
    expect(venueAdmin).toContain("item.venueId === houseActiveVenue.id");
    expect(venueAdmin).toContain("venueId: houseActiveVenue?.id");
    expect(venueAdmin).toContain("venueId: houseActiveVenue.id");
  });
});
