import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Tô na Pista minimum home location", () => {
  it("stores city, neighborhood and postal code on the user", () => {
    const schema = read("backend/prisma/schema.prisma");
    for (const field of ["city", "neighborhood", "postalCode"]) expect(schema).toContain(field);
  });

  it("protects activation and enforces a complete location server-side", () => {
    const routes = read("backend/src/routes/index.js"); const push = read("backend/src/controllers/push.controller.js");
    expect(routes).toContain('router.post("/push/to-na-pista/activate", requireAuth, pushLimiter, activateToNaPista)');
    expect(push).toContain('error: "home_location_required"');
    expect(push).toContain("req.user?.city");
  });

  it("offers a friendly fallback and settings editor without requiring an address", () => {
    const explore = read("frontend/src/pages/ExplorePage.jsx"); const location = read("frontend/src/components/settings/LocationBaseCard.jsx");
    expect(explore).toContain("Para usar o Tô na Pista, precisamos saber sua cidade, bairro e CEP.");
    expect(explore).toContain('to="/settings#location"');
    expect(location).toContain("Não pedimos seu endereço completo");
    expect(location).not.toContain("logradouro");
  });
});
