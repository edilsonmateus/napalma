import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildAdvertiserBackfillPlan,
  createLegacyKey,
  normalizeAdvertiserName
} from "../prisma/lib/advertiser-backfill-plan.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function campaign(overrides = {}) {
  return {
    id: "campaign-1",
    advertiser: "Casa de Francisca",
    advertiserAccountId: null,
    updatedAt: "2026-06-01T12:00:00.000Z",
    ...overrides
  };
}

describe("Ads advertiser backfill dry-run", () => {
  it("normalizes accents, casing and repeated whitespace only for grouping", () => {
    expect(normalizeAdvertiserName("  Cása   de FRANCISCA ")).toBe("casa de francisca");
    expect(createLegacyKey("casa de francisca")).toMatch(/^legacy:[a-f0-9]{64}$/);
  });

  it("groups equivalent legacy spellings and keeps the most recent display name", () => {
    const plan = buildAdvertiserBackfillPlan(
      [
        campaign(),
        campaign({
          id: "campaign-2",
          advertiser: "Cása  de  Francisca",
          updatedAt: "2026-06-02T12:00:00.000Z"
        })
      ],
      []
    );

    expect(plan.summary).toMatchObject({
      normalizedGroups: 1,
      accountsToCreate: 1,
      campaignsToLink: 2,
      conflicts: 0
    });
    expect(plan.accountPlans[0]).toMatchObject({
      displayName: "Cása  de  Francisca",
      accountAction: "create_draft_unclassified",
      campaignCount: 2
    });
  });

  it("reuses an account with the deterministic legacy key", () => {
    const normalizedName = normalizeAdvertiserName("Casa de Francisca");
    const plan = buildAdvertiserBackfillPlan([campaign()], [
      {
        id: "account-1",
        name: "Casa de Francisca",
        legacyKey: createLegacyKey(normalizedName)
      }
    ]);

    expect(plan.summary).toMatchObject({ accountsToCreate: 0, accountsToReuse: 1 });
    expect(plan.accountPlans[0].existingAccountId).toBe("account-1");
  });

  it("reports empty names and mismatched existing links instead of guessing", () => {
    const plan = buildAdvertiserBackfillPlan(
      [
        campaign({ id: "empty", advertiser: "   " }),
        campaign({ id: "mismatch", advertiserAccountId: "account-other" })
      ],
      [{ id: "account-other", name: "Outra conta", legacyKey: "legacy:other" }]
    );

    expect(plan.conflicts.map((item) => item.code)).toEqual([
      "empty_advertiser",
      "campaign_link_mismatch"
    ]);
    expect(plan.summary.campaignsToLink).toBe(0);
  });

  it("contains no database write operation or apply mode", () => {
    const script = fs.readFileSync(
      path.resolve(__dirname, "../prisma/backfill-advertiser-accounts-dry-run.js"),
      "utf8"
    );

    expect(script).not.toMatch(/prisma\.[a-zA-Z]+\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\s*\(/);
    expect(script).not.toContain("$transaction");
    expect(script).not.toContain("--apply");
    expect(script).toContain("findMany");
  });
});
