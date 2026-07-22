import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const eventsController = fs.readFileSync(path.join(root, "backend", "src", "controllers", "events.controller.js"), "utf8");
const artistEpkController = fs.readFileSync(path.join(root, "backend", "src", "controllers", "artistEpk.controller.js"), "utf8");

describe("event poster feed foundation", () => {
  it("keeps legacy imageUrl while exposing the poster and venue image explicitly", () => {
    expect(eventsController).toContain("posterImageUrl: event.posterImageUrl ?? \"\"");
    expect(eventsController).toContain("venueImageUrl: event.venue.imageUrl ?? \"\"");
    expect(eventsController).toContain("imageUrl: event.posterImageUrl ?? event.imageUrl ?? event.venue.imageUrl ?? \"\"");
  });

  it("makes the event poster available in the public artist EPK schedule", () => {
    expect(artistEpkController).toContain("posterImageUrl: event.posterImageUrl || \"\"");
    expect(artistEpkController).toContain("venueImageUrl: event.venue?.imageUrl || \"\"");
    expect(artistEpkController).toContain("imageUrl: event.posterImageUrl || event.imageUrl || event.venue?.imageUrl || \"\"");
  });
});
