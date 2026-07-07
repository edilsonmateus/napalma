import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/advertiserPortal.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const uploadGuard = fs.readFileSync(path.join(root, "backend/src/middlewares/advertiserAccess.js"), "utf8");
const app = fs.readFileSync(path.join(root, "frontend/src/App.jsx"), "utf8");

describe("advertiser self-service portal security", () => {
  it("requires authentication and feature flags on self-service routes", () => {
    expect(routes).toContain('router.get("/me/advertiser-accounts", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED")');
    expect(routes).toContain('router.post("/me/advertiser-access-requests", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED")');
    expect(routes).toContain('router.post("/me/advertiser-reviews/:entityType/:id/submit", requireAuth, requireFeatureFlag("ADS_REVIEW_WORKFLOW_ENABLED")');
  });

  it("scopes mutations and uploads to active memberships with write roles", () => {
    expect(controller).toContain('status: "active"');
    expect(controller).toContain('const WRITE_ROLES = ["owner", "admin", "campaign_manager"]');
    expect(uploadGuard).toContain('accountId: campaign.advertiserAccountId');
    expect(uploadGuard).toContain('role: { in: WRITE_ROLES }');
  });

  it("keeps review decisions out of the advertiser portal", () => {
    expect(controller).not.toContain("approveAdReview");
    expect(controller).not.toContain("rejectAdReview");
    expect(app).toContain('path="/workspace/anunciante"');
  });

  it("keeps advertiser access requests pending until admin approval", () => {
    expect(controller).toContain('status: "pending_review"');
    expect(controller).toContain('source: "self_service_request"');
    expect(controller).toContain('status: "invited"');
    expect(controller).toContain("requestMyAdvertiserAccess");
  });
});
