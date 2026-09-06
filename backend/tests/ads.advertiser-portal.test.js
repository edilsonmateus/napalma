import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/advertiserPortal.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const uploadGuard = fs.readFileSync(path.join(root, "backend/src/middlewares/advertiserAccess.js"), "utf8");
const app = fs.readFileSync(path.join(root, "frontend/src/App.jsx"), "utf8");
const advertise = fs.readFileSync(path.join(root, "frontend/src/pages/AdvertisePage.jsx"), "utf8");
const signup = fs.readFileSync(path.join(root, "frontend/src/pages/SignupPage.jsx"), "utf8");
const portal = fs.readFileSync(path.join(root, "frontend/src/pages/AdvertiserPortalPage.jsx"), "utf8");

describe("advertiser self-service portal security", () => {
  it("requires authentication and feature flags on self-service routes", () => {
    expect(routes).toContain('router.get("/me/advertiser-accounts", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED")');
    expect(routes).toMatch(/router\.post\("\/me\/advertiser-access-requests", requireAuth, [\s\S]*requireFeatureFlag\("ADS_ADVERTISER_ACCOUNTS_ENABLED"\)/);
    expect(routes).toMatch(/router\.post\("\/me\/advertiser-reviews\/:entityType\/:id\/submit", requireAuth, [\s\S]*requireFeatureFlag\("ADS_REVIEW_WORKFLOW_ENABLED"\)/);
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

  it("explains authentication before a visitor enters the advertiser workspace", () => {
    expect(advertise).toContain('to="/explore" className="advertise-back-link"');
    expect(advertise).toContain('id="advertise-account-gate"');
    expect(advertise).toContain("Faça login para solicitar acesso");
    expect(advertise).toContain('state={{ from: "/workspace/anunciante" }}');
    expect(signup).toContain("navigate(redirectTo || getRoleHome(data.user.role)");
  });

  it("keeps access-request drafts isolated from other logins on a shared browser", () => {
    expect(portal).toContain('REQUEST_DRAFT_KEY_PREFIX = "77gira.ads.advertiserRequestDraft:v2:"');
    expect(portal).toContain("sessionStorage.getItem(key)");
    expect(portal).toContain("ownerUserId !== user.id");
    expect(portal).toContain("localStorage.removeItem(LEGACY_REQUEST_DRAFT_KEY)");
  });

  it("distinguishes the account owner from the editable commercial contact", () => {
    expect(portal).toContain("Seu login continua como proprietário da conta");
    expect(portal).toContain("E-mail de contato comercial");
    expect(portal).toContain("Nome da marca, empresa ou projeto");
  });

  it("presents and resumes the advertiser legal acceptance without requiring a repeated action", () => {
    const advertiserService = fs.readFileSync(path.join(root, "frontend/src/services/advertiserPortal.service.js"), "utf8");
    const legalDocuments = fs.readFileSync(path.join(root, "frontend/src/services/legalDocuments.service.js"), "utf8");
    expect(portal).toContain("Condições para anunciar");
    expect(portal).toContain("Ler e aceitar Termos de Publicidade");
    expect(portal).toContain('getMyLegalRequirements("advertiser_access")');
    expect(legalDocuments).toContain("retryAfterLegalAcceptance");
    expect(advertiserService).toContain('retryAfterLegalAcceptance("advertiser_access"');
    expect(advertiserService).toContain('retryAfterLegalAcceptance("advertiser_campaign"');
    expect(advertiserService).toContain('retryAfterLegalAcceptance("patacos_purchase"');
  });
});
