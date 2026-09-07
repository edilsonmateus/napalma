import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  VENUE_IMAGE_ACCEPTED_MIME_TYPES,
  VENUE_IMAGE_MAX_FILE_SIZE_BYTES,
  VENUE_IMAGE_RECOMMENDED_HEIGHT,
  VENUE_IMAGE_RECOMMENDED_WIDTH,
  validateVenueImageFileBasics
} from "../../frontend/src/utils/venueImage.js";

describe("venue image upload contract", () => {
  it("publishes the exact format guidance used by the form", () => {
    expect(VENUE_IMAGE_RECOMMENDED_WIDTH).toBe(1600);
    expect(VENUE_IMAGE_RECOMMENDED_HEIGHT).toBe(900);
    expect(VENUE_IMAGE_MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(VENUE_IMAGE_ACCEPTED_MIME_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);

    const field = fs.readFileSync(
      path.join(process.cwd(), "../frontend/src/components/venues/VenueImageUploadField.jsx"),
      "utf8"
    );
    expect(field).toContain("1600 × 900 px");
    expect(field).toContain("16:9");
    expect(field).toContain("JPG, PNG ou WebP");
    expect(field).toContain("5 MB");
  });

  it("rejects unsupported and oversized files before upload", () => {
    expect(validateVenueImageFileBasics({ type: "image/heic", size: 80_000 }).ok).toBe(false);
    expect(validateVenueImageFileBasics({ type: "image/jpeg", size: 5 * 1024 * 1024 }).ok).toBe(true);
    expect(validateVenueImageFileBasics({ type: "image/png", size: 5 * 1024 * 1024 + 1 }).ok).toBe(false);
  });
});
