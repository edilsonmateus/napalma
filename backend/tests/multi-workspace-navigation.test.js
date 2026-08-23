import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const roles = read("frontend/src/utils/roles.js");
const app = read("frontend/src/App.jsx");
const navigation = read("frontend/src/components/layout/BottomNav.jsx");
const signatures = read("frontend/src/components/settings/MyLegalSignaturesCard.jsx");

describe("multi-workspace personal navigation", () => {
  it("keeps Explore as the default experience for every account", () => {
    expect(roles).not.toContain('return "/settings/venues";');
    expect(roles).toContain('return "/explore";');
    expect(roles).not.toContain('return "/workspace/produtor";');
  });

  it("uses the current route, not a global role, to choose a professional menu", () => {
    expect(navigation).toContain("const isVenueWorkspace");
    expect(navigation).toContain("const isArtistWorkspace");
    expect(navigation).toContain('label: "Meu 77Gira"');
    expect(navigation).toContain('to: "/history", label: "Histórico"');
    expect(navigation).not.toContain("isVenueRole(user?.role)");
    expect(navigation).not.toContain("isProducerRole(user?.role)");
  });

  it("does not redirect a venue manager away from personal history", () => {
    expect(app).toContain('<Route path="/history" element={<HistoryPage />} />');
    expect(app).not.toContain('path="/history"\n              element={isVenueRole');
  });

  it("refreshes the session immediately after a formal signature", () => {
    expect(signatures).toContain('new CustomEvent("77gira:professional-access-updated")');
    expect(app).toContain('window.addEventListener("77gira:professional-access-updated", refreshProfessionalAccess)');
  });
});
