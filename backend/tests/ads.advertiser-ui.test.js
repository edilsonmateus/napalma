import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "../../frontend");

describe("Ads advertiser read-only UI contract", () => {
  it("documents the frontend feature flag as disabled", () => {
    const envExample = fs.readFileSync(path.join(frontendRoot, ".env.example"), "utf8");
    expect(envExample).toContain('VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED="false"');
  });

  it("uses a dedicated read-only service", () => {
    const service = fs.readFileSync(
      path.join(frontendRoot, "src/services/advertiserAccounts.service.js"),
      "utf8"
    );
    expect(service).toContain('api.get("/ads/advertiser-accounts"');
    expect(service).toContain('api.get(`/ads/advertiser-accounts/${id}`)');
    expect(service).not.toMatch(/api\.(post|patch|put|delete)\s*\(/);
  });

  it("hides the navigation and content behind the frontend flag", () => {
    const page = fs.readFileSync(
      path.join(frontendRoot, "src/pages/AdsAdminPage.jsx"),
      "utf8"
    );
    expect(page).toContain("VITE_ADS_ADVERTISER_ACCOUNTS_ENABLED");
    expect(page).toContain('ADVERTISER_ACCOUNTS_ENABLED ? [["advertisers", "Anunciantes"]]');
    expect(page).toContain('adsSection === "advertisers" && ADVERTISER_ACCOUNTS_ENABLED');
    expect(page).toContain("modo somente leitura");
  });
});
