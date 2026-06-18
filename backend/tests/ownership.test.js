import { describe, expect, it } from "vitest";
import { canManageArtist, canManageEvent, canManageVenue, isAdmin } from "../src/lib/access.control.js";

describe("ownership utils", () => {
  const admin = { id: "u-admin", role: "admin" };
  const producer = { id: "u-producer", role: "producer" };
  const manager = { id: "u-manager", role: "venue_manager" };
  const attendee = { id: "u-attendee", role: "attendee" };

  it("isAdmin should only return true for admin role", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(producer)).toBe(false);
  });

  it("producer can manage own venue only", () => {
    expect(canManageVenue(producer, { createdByUserId: "u-producer" })).toBe(true);
    expect(canManageVenue(producer, { createdByUserId: "other" })).toBe(false);
  });

  it("admin can manage any venue/artist/event", () => {
    expect(canManageVenue(admin, { createdByUserId: "x" })).toBe(true);
    expect(canManageArtist(admin, { createdByUserId: "x" })).toBe(true);
    expect(canManageEvent(admin, { createdByUserId: "x", venue: {} })).toBe(true);
  });

  it("venue_manager can manage event via legacy managerUserId", () => {
    const event = {
      createdByUserId: "other",
      venue: { managerUserId: "u-manager", managerAccesses: [] }
    };
    expect(canManageEvent(manager, event)).toBe(true);
  });

  it("venue_manager can manage event via managerAccesses link", () => {
    const event = {
      createdByUserId: "other",
      venue: { managerUserId: null, managerAccesses: [{ userId: "u-manager" }] }
    };
    expect(canManageEvent(manager, event)).toBe(true);
  });

  it("attendee cannot manage event", () => {
    const event = {
      createdByUserId: "u-attendee",
      venue: { managerUserId: "u-attendee", managerAccesses: [{ userId: "u-attendee" }] }
    };
    expect(canManageEvent(attendee, event)).toBe(false);
  });

  it("producer can manage own artist and event only", () => {
    expect(canManageArtist(producer, { createdByUserId: "u-producer" })).toBe(true);
    expect(canManageArtist(producer, { createdByUserId: "other" })).toBe(false);

    expect(canManageEvent(producer, { createdByUserId: "u-producer", venue: {} })).toBe(true);
    expect(canManageEvent(producer, { createdByUserId: "other", venue: {} })).toBe(false);
  });
});
