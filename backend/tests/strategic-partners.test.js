import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

describe("Strategic partners", () => {
  it("keeps private partner management behind the delegated operational scope", () => {
    const routes = read("backend/src/routes/index.js");
    const schema = read("backend/prisma/schema.prisma");

    expect(schema).toContain('partners');
    expect(schema).toContain("model StrategicPartner");
    expect(routes).toContain('const canManageStrategicPartners = [requireAuth, requireOperationScope("partners")]');
    expect(routes).toContain('router.get("/admin/operations/partners", ...canManageStrategicPartners');
    expect(routes).toContain('router.post("/admin/operations/partners", ...canManageStrategicPartners');
  });

  it("only exposes valid active public partners and audits operational changes", () => {
    const controller = read("backend/src/controllers/strategicPartners.controller.js");

    expect(controller).toContain('status: "active"');
    expect(controller).toContain("publicVisible: true");
    expect(controller).toContain("isPermanent: true");
    expect(controller).toContain('action: "strategic_partner.created"');
    expect(controller).toContain('action: "strategic_partner.updated"');
    expect(controller).toContain("if (!includePrivate) return base;");
  });

  it("keeps the institutional capture route separate from the signed-in application", () => {
    const app = read("frontend/src/App.jsx");
    const capture = read("frontend/src/pages/PartnerInstitutionalPage.jsx");

    expect(app).toContain('path="/parcerias/77gira"');
    expect(app).toContain("isPublicPartnersRoute");
    expect(capture).toContain("77GIRA · PARCERIAS");
  });
});
