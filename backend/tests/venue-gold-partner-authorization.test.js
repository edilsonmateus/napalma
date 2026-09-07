import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findVenueAdminOnlyFields,
  hasVenueAdminOnlyFields,
  VENUE_ADMIN_ONLY_FIELDS
} from "../src/policies/venueFields.policy.js";

describe("Gold Partner authorization boundary", () => {
  it("classifies Gold Partner as an admin-only venue field", () => {
    expect(VENUE_ADMIN_ONLY_FIELDS).toEqual(["goldPartner"]);
    expect(findVenueAdminOnlyFields({ name: "Casa", goldPartner: true })).toEqual(["goldPartner"]);
    expect(hasVenueAdminOnlyFields({ goldPartner: false })).toBe(true);
    expect(hasVenueAdminOnlyFields({ name: "Casa" })).toBe(false);
  });

  it("keeps Gold Partner out of approved venue-update claims", () => {
    const service = fs.readFileSync(
      path.join(process.cwd(), "src/services/claimAccess.service.js"),
      "utf8"
    );
    const allowedFields = service.match(/const allowed = \[(.*?)\];/s)?.[1] || "";

    expect(allowedFields).not.toContain("goldPartner");
  });

  it("shows the checkbox only behind the admin condition in both venue forms", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "../frontend/src/pages/VenuesAdminPage.jsx"),
      "utf8"
    );
    const protectedCheckboxes = page.match(/\{isAdmin \? \(\s*<label className="checkbox-inline">\s*<input\s*type="checkbox"\s*name="goldPartner"/g) || [];

    expect(protectedCheckboxes).toHaveLength(2);
    expect(page).toContain('if (name === "goldPartner" && !isAdmin) return;');
    expect(page).toContain("if (!isAdmin) delete payload.goldPartner;");
  });
});
