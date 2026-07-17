import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { adTargetingSchema } from "../src/utils/adTargetingPolicy.js";

const workspacePage = fs.readFileSync(
  path.resolve(process.cwd(), "../frontend/src/pages/AdvertiserPortalPage.jsx"),
  "utf8"
);

describe("Ads workspace targeting payload", () => {
  it("accepts a stage-one campaign without slots or optional delivery filters", () => {
    expect(adTargetingSchema.parse({
      objective: "boost_event",
      slots: []
    })).toEqual({ objective: "boost_event", slots: [] });
  });

  it("accepts only official objectives and inventory slots", () => {
    expect(adTargetingSchema.safeParse({
      objective: "brand_campaign",
      slots: ["explore_feed_large", "radar_header"]
    }).success).toBe(true);
    expect(adTargetingSchema.safeParse({
      objective: "free_form_audience",
      slots: ["unknown_slot"]
    }).success).toBe(false);
  });

  it("preflights uploaded creative dimensions and exposes blocking feedback", () => {
    expect(workspacePage).toContain("function inspectCreativeFile");
    expect(workspacePage).toContain("Proporção incompatível com este posicionamento");
    expect(workspacePage).toContain('role={creativeFeedback.tone === "error" ? "alert" : "status"}');
    expect(workspacePage).toContain("setCreativeFeedback(feedback)");
  });

  it("keeps a local creative preview independently for every selected slot", () => {
    expect(workspacePage).toContain("const [creativeDrafts, setCreativeDrafts]");
    expect(workspacePage).toContain("const localCreativePreviews");
    expect(workspacePage).toContain("imageUrl: creativePreviewUrl");
    expect(workspacePage).toContain("!localCreativeSlots.has(item.slot)");
    expect(workspacePage).toContain("creativeDraftsRef.current[creative.slot]");
  });

  it("saves every prepared slot draft in one explicit creative action", () => {
    expect(workspacePage).toContain("const draftsToUpload = selectedSlots");
    expect(workspacePage).toContain("for (const { slotId, draft } of draftsToUpload)");
    expect(workspacePage).toContain("draftsToUpload.forEach(({ slotId }) => delete next[slotId])");
  });
});
