import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const controller = fs.readFileSync(path.join(root, "backend/src/controllers/artistTeam.controller.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "backend/src/routes/index.js"), "utf8");
const claims = fs.readFileSync(path.join(root, "backend/src/controllers/claims.controller.js"), "utf8");
const app = fs.readFileSync(path.join(root, "frontend/src/App.jsx"), "utf8");
const hub = fs.readFileSync(path.join(root, "frontend/src/components/settings/ManagementHub.jsx"), "utf8");

describe("artist claim directory and collaborative team", () => {
  it("protects every team endpoint with authentication and the feature flag", () => {
    expect(routes).toContain('router.get("/me/artists/:artistId/team", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED")');
    expect(routes).toContain('router.post("/me/artists/:artistId/team", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED")');
    expect(routes).toContain('router.patch("/me/artist-team/:id", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED")');
    expect(routes).toContain('router.delete("/me/artist-team/:id", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED")');
  });

  it("does not allow an invitation or direct update to create another owner", () => {
    expect(controller).toContain('role: z.enum(["manager", "editor", "viewer"])');
    expect(controller).not.toContain('z.enum(["owner", "manager", "editor", "viewer"])');
    expect(controller).toContain("last_artist_owner");
  });

  it("separates ownership claims from access requests", () => {
    expect(claims).toContain('z.enum(["ownership", "team_access", "artist_inclusion", "venue_update"])');
    expect(claims).toContain('existing.requestType === "team_access"');
    expect(claims).toContain('existing.requestType === "artist_inclusion"');
  });

  it("exposes dedicated authenticated directory and team routes in the product", () => {
    expect(app).toContain('path="/reivindicar-artista"');
    expect(app).toContain('path="/workspace/artista/equipe"');
    expect(hub).toContain('to="/reivindicar-artista"');
    expect(hub).toContain('to: "/workspace/artista/equipe"');
  });
});
