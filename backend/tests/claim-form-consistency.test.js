import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const artistProfile = read("frontend/src/pages/ArtistProfilePage.jsx");
const artistDirectory = read("frontend/src/pages/ArtistClaimDirectoryPage.jsx");
const venueDirectory = read("frontend/src/pages/VenueClaimDirectoryPage.jsx");
const css = read("frontend/src/styles/globals.css");

describe("claim form consistency", () => {
  it("uses one dark form contract across artist and venue claim flows", () => {
    expect(artistProfile).toContain('claim-form artist-claim-form');
    expect(artistDirectory).toContain('claim-form artist-inclusion-form');
    expect(venueDirectory).toContain('claim-form venue-claim-form');
    expect(css).toContain('.claim-form :is(input, select, textarea)');
    expect(css).toContain('background-color: #111214;');
    expect(css).toContain('.claim-form :is(input, select, textarea):focus-visible');
    expect(css).toContain('.claim-form-backdrop { align-items: start; overflow-y: auto; }');
  });

  it("keeps primary and secondary claim actions aligned", () => {
    expect(css).toContain('.claim-form .form-actions-inline > :is(.btn-primary, .chip)');
    expect(css).toContain('min-height: 40px;');
    expect(css).toContain('border-radius: var(--radius-pill);');
  });
});
