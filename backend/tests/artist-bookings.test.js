import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const schema = fs.readFileSync(path.join(root, "backend/prisma/schema.prisma"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/artistBookings.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const profile = fs.readFileSync(path.join(root, "frontend/src/pages/ArtistProfilePage.jsx"), "utf8");

describe("artist booking requests", () => {
  it("models a private lead lifecycle without exposing it on Artist", () => {
    expect(schema).toContain("model ArtistBookingRequest");
    expect(schema).toContain("enum ArtistBookingStatus");
    expect(schema).toContain("proposal_sent");
    expect(schema).toContain("spam");
  });

  it("accepts requests only for verified artists with active management", () => {
    expect(controller).toContain("isVerified: true");
    expect(controller).toContain('accesses: { some: { status: "active" } }');
    expect(controller).toContain("if (payload.companyWebsite)");
  });

  it("rate limits the public endpoint and authenticates the private inbox", () => {
    expect(routes).toContain('keyPrefix: "artist-booking"');
    expect(routes).toContain('router.post("/artist-bookings", requireFeatureFlag("ARTIST_BOOKING_REQUESTS_ENABLED"), artistBookingLimiter');
    expect(routes).toContain('router.get("/me/artists/:artistId/bookings", requireAuth');
  });

  it("shows the public call to action only for verified claimed artists", () => {
    expect(profile).toContain("artist.isVerified && artist.isClaimed");
    expect(profile).toContain("Contratar {artist.name}");
  });
});
