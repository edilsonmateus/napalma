import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdSlot } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AD_PLACEMENTS } from "../src/config/adPlacements.js";
import { listAdPlacements } from "../src/controllers/adPlacements.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../../frontend");

describe("Ads canonical placement catalog", () => {
  it("maps every current AdSlot exactly once", () => {
    const legacySlots = AD_PLACEMENTS.map((placement) => placement.legacySlot);
    expect(legacySlots).toEqual(Object.values(AdSlot));
    expect(new Set(legacySlots).size).toBe(4);
  });

  it("centralizes dimensions and keeps purchasing disabled", () => {
    for (const placement of AD_PLACEMENTS) {
      expect(placement.key).toBe(placement.legacySlot);
      expect(placement.recommendedWidth).toBeGreaterThan(0);
      expect(placement.recommendedHeight).toBeGreaterThan(0);
      expect(placement.allowedMimeTypes).toEqual(["image/jpeg", "image/png", "image/webp"]);
      expect(placement.maxFileSizeBytes).toBe(5 * 1024 * 1024);
      expect(placement.commercialRules.purchaseEnabled).toBe(false);
      expect(placement.commercialRules.pricingConfigured).toBe(false);
    }
  });

  it("exposes the versioned catalog through a read-only controller", () => {
    const res = { json: vi.fn() };
    listAdPlacements({}, res);
    expect(res.json).toHaveBeenCalledWith({ items: AD_PLACEMENTS });
  });

  it("keeps the frontend catalog hidden behind a disabled flag", () => {
    const envExample = fs.readFileSync(path.join(frontendRoot, ".env.example"), "utf8");
    const page = fs.readFileSync(path.join(frontendRoot, "src/pages/AdsAdminPage.jsx"), "utf8");
    expect(envExample).toContain('VITE_ADS_PLACEMENT_CATALOG_ENABLED="false"');
    expect(page).toContain("VITE_ADS_PLACEMENT_CATALOG_ENABLED");
    expect(page).toMatch(/PLACEMENT_CATALOG_ENABLED\s+\?\s+\[\["inventory", "Inventário", placements\.length\]\]/);
    expect(page).toContain('adsSection === "inventory" && PLACEMENT_CATALOG_ENABLED');
  });
});
