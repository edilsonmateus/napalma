import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const schema = fs.readFileSync(path.join(root, "backend/prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(root, "backend/prisma/migrations/20260703010000_ads_review_governance/migration.sql"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const page = fs.readFileSync(path.join(root, "frontend/src/pages/AdsAdminPage.jsx"), "utf8");

describe("ADS review workflow", () => {
  it("keeps legacy review status nullable", () => {
    expect(schema).toMatch(/reviewStatus\s+AdReviewStatus\?/);
    expect(migration).not.toMatch(/UPDATE\s+"AdCampaign"/i);
  });

  it("protects all review endpoints with the feature flag and admin guard", () => {
    expect(routes).toContain('const canManageAdReviews = [...canManageAds, requireFeatureFlag("ADS_REVIEW_WORKFLOW_ENABLED")]');
    expect(routes).toContain('router.post("/ads/reviews/:entityType/:id/approve", ...canManageAdReviews');
    expect(routes).toContain('router.post("/ads/reviews/:entityType/:id/reject", ...canManageAdReviews');
  });

  it("exposes the review queue only behind the frontend flag", () => {
    expect(page).toContain("VITE_ADS_REVIEW_WORKFLOW_ENABLED");
    expect(page).toContain('[["reviews", "Revisao"]]');
    expect(page).toContain('adsSection === "reviews" && REVIEW_WORKFLOW_ENABLED');
  });
});
