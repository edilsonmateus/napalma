import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const schema = fs.readFileSync(path.join(root, "backend/prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(root, "backend/prisma/migrations/20260704010000_artist_epk_foundation/migration.sql"), "utf8");
const claims = fs.readFileSync(path.join(root, "backend/src/controllers/claims.controller.js"), "utf8");
const epk = fs.readFileSync(path.join(root, "backend/src/controllers/artistEpk.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");

describe("artist EPK foundation", () => {
  it("adds auditable verification, professional profile and multi-user access", () => {
    expect(schema).toContain("model ArtistProfessionalProfile");
    expect(schema).toContain("model ArtistAccess");
    expect(schema).toMatch(/verifiedAt\s+DateTime\?/);
    expect(schema).toMatch(/verifiedBy\s+User\?\s+@relation\("ArtistVerifiedBy"/);
    expect(migration).toContain('CREATE TYPE "ArtistAccessRole"');
  });

  it("approves ownership and verification in the same transaction", () => {
    expect(claims).toContain("await tx.artistAccess.upsert");
    expect(claims).toContain("isVerified: true, verifiedAt: new Date(), verifiedByUserId: req.user.id");
    expect(claims).toContain('isAttendee && data.targetType !== ClaimTargetType.artist');
  });

  it("keeps private contact fields out of the public EPK DTO", () => {
    const publicMapper = epk.slice(epk.indexOf("function publicArtist"), epk.indexOf("function eventPayload"));
    expect(publicMapper).not.toContain("professionalEmail:");
    expect(publicMapper).not.toContain("professionalPhone:");
    expect(publicMapper).not.toContain("contactPhone:");
    expect(publicMapper).toContain("bookingAvailable:");
  });

  it("keeps public EPK open and guards private editing with feature flags and auth", () => {
    expect(routes).toContain('router.get("/artist-epk/:ref", getArtistEpk)');
    expect(routes).toContain('requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), updateMyArtistProfile');
  });
});
