import { describe, expect, it } from "vitest";
import {
  VENUE_CREATION_ORIGIN,
  VENUE_VISIBILITY_STATUS,
  canTransitionVenueVisibility,
  initialVenueVisibilityFor,
  isPublicVenueVisibility,
  isVenuePubliclyEligible,
  publicVenueRelationWhere,
  publicVenueWhere
} from "./venueVisibility.service.js";

describe("venue visibility eligibility", () => {
  it("exposes only published venues to public contexts", () => {
    expect(isPublicVenueVisibility(VENUE_VISIBILITY_STATUS.PUBLISHED)).toBe(true);
    expect(isPublicVenueVisibility(VENUE_VISIBILITY_STATUS.DRAFT)).toBe(false);
    expect(isPublicVenueVisibility(VENUE_VISIBILITY_STATUS.PAUSED)).toBe(false);
    expect(isVenuePubliclyEligible({ visibilityStatus: "published" })).toBe(true);
    expect(isVenuePubliclyEligible({ visibilityStatus: "paused" })).toBe(false);
  });

  it("allows only the deliberate publication and pause transitions", () => {
    expect(canTransitionVenueVisibility("draft", "published")).toBe(true);
    expect(canTransitionVenueVisibility("published", "paused")).toBe(true);
    expect(canTransitionVenueVisibility("paused", "published")).toBe(true);
    expect(canTransitionVenueVisibility("draft", "paused")).toBe(false);
    expect(canTransitionVenueVisibility("published", "draft")).toBe(false);
    expect(canTransitionVenueVisibility("paused", "draft")).toBe(false);
    expect(canTransitionVenueVisibility("published", "published")).toBe(false);
  });

  it("makes each creation origin explicit without exposing acquisition before review", () => {
    expect(initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.ADMIN_MANUAL)).toBe("published");
    expect(initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.SEED)).toBe("published");
    expect(initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.ACQUISITION)).toBe("draft");
    expect(initialVenueVisibilityFor(VENUE_CREATION_ORIGIN.USER_INCLUSION)).toBe("draft");
  });

  it("builds filters that cannot accidentally include a hidden venue", () => {
    expect(publicVenueWhere({ region: "Centro" })).toEqual({
      region: "Centro",
      visibilityStatus: "published"
    });
    expect(publicVenueRelationWhere()).toEqual({
      is: { visibilityStatus: "published" }
    });
  });
});
