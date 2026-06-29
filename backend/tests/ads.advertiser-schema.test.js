import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AdvertiserAccountStatus,
  AdvertiserAccountType,
  AdvertiserMembershipRole,
  AdvertiserMembershipStatus,
  Prisma
} from "@prisma/client";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getModel(name) {
  return Prisma.dmmf.datamodel.models.find((model) => model.name === name);
}

describe("Ads advertiser foundation schema", () => {
  it("exports the approved account and membership enums", () => {
    expect(Object.values(AdvertiserAccountType)).toEqual([
      "unclassified",
      "venue",
      "producer",
      "artist",
      "brand",
      "agency",
      "group",
      "internal"
    ]);
    expect(Object.values(AdvertiserAccountStatus)).toEqual([
      "draft",
      "pending_review",
      "active",
      "suspended",
      "rejected",
      "archived"
    ]);
    expect(Object.values(AdvertiserMembershipRole)).toContain("campaign_manager");
    expect(Object.values(AdvertiserMembershipStatus)).toEqual([
      "invited",
      "active",
      "suspended",
      "revoked"
    ]);
  });

  it("keeps the legacy advertiser required and the account relation optional", () => {
    const campaign = getModel("AdCampaign");
    const advertiser = campaign.fields.find((field) => field.name === "advertiser");
    const advertiserAccountId = campaign.fields.find(
      (field) => field.name === "advertiserAccountId"
    );

    expect(advertiser.isRequired).toBe(true);
    expect(advertiserAccountId.isRequired).toBe(false);
  });

  it("creates account and membership models without entity ownership links", () => {
    const account = getModel("AdvertiserAccount");
    const membership = getModel("AdvertiserMembership");

    expect(account).toBeTruthy();
    expect(membership).toBeTruthy();
    expect(account.fields.some((field) => field.name === "legacyKey")).toBe(true);
    expect(membership.uniqueFields).toContainEqual(["accountId", "userId"]);
    expect(account.fields.some((field) => field.name === "venueId")).toBe(false);
    expect(account.fields.some((field) => field.name === "artistId")).toBe(false);
  });

  it("keeps the foundation migration additive", () => {
    const migrationPath = path.resolve(
      __dirname,
      "../prisma/migrations/20260628230000_ads_advertiser_foundation/migration.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain('CREATE TABLE "AdvertiserAccount"');
    expect(sql).toContain('CREATE TABLE "AdvertiserMembership"');
    expect(sql).toContain('ADD COLUMN     "advertiserAccountId" TEXT');
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|TYPE)\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+"AdCampaign"\b/i);
  });
});
