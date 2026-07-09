import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "../../frontend");

describe("Ads advertiser admin UI contract", () => {
  it("documents the frontend feature flag as disabled", () => {
    const envExample = fs.readFileSync(path.join(frontendRoot, ".env.example"), "utf8");
    expect(envExample).toContain('VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED="false"');
  });

  it("uses a dedicated account service with the approved first mutations", () => {
    const service = fs.readFileSync(
      path.join(frontendRoot, "src/services/advertiserAccounts.service.js"),
      "utf8"
    );
    expect(service).toContain('api.get("/ads/advertiser-accounts"');
    expect(service).toContain('api.get(`/ads/advertiser-accounts/${id}`)');
    expect(service).toContain('api.post("/ads/advertiser-accounts"');
    expect(service).toContain('api.patch(`/ads/advertiser-accounts/${id}`');
    expect(service).toContain('api.post(`/ads/advertiser-accounts/${accountId}/memberships`');
    expect(service).toContain('api.patch(`/ads/advertiser-memberships/${id}`');
    expect(service).toContain('api.delete(`/ads/advertiser-memberships/${id}`');
    expect(service).toContain('api.patch(`/ads/campaigns/${campaignId}/advertiser-account`');
    expect(service).not.toMatch(/api\.put\s*\(/);
  });

  it("hides the navigation and content behind the frontend flag", () => {
    const page = fs.readFileSync(
      path.join(frontendRoot, "src/pages/AdsAdminPage.jsx"),
      "utf8"
    );
    expect(page).toContain("VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED");
    expect(page).toMatch(/ADVERTISER_ACCOUNTS_ENABLED\s+\?\s+\[\["advertisers", "Anunciantes", pendingAdvertiserRequests\.length\]\]/);
    expect(page).toContain('adsSection === "advertisers" && ADVERTISER_ACCOUNTS_ENABLED');
    expect(page).toContain("Nova conta");
    expect(page).toContain("Editar conta");
    expect(page).toContain("Adicionar membro");
    expect(page).toContain("Revogar");
    expect(page).toContain("Vincular campanha");
    expect(page).toContain("Desvincular");
    expect(page).toContain("VITE_ADS_R2_CREATIVE_UPLOAD_ENABLED");
    expect(page).toContain("Enviar imagem ao Cloudflare R2");
  });
});
