export const VENUE_VISIBILITY_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  PAUSED: "paused"
});

export const VENUE_CREATION_ORIGIN = Object.freeze({
  ADMIN_MANUAL: "admin_manual",
  ACQUISITION: "acquisition",
  SEED: "seed"
});

export const VENUE_VISIBILITY_REASON_CODE = Object.freeze({
  VENUE_REQUEST: "venue_request",
  TEMPORARY_CLOSURE: "temporary_closure",
  CATALOG_REVIEW: "catalog_review",
  SCHEDULE_ISSUE: "schedule_issue",
  OPERATIONAL_OTHER: "operational_other"
});

const TRANSITIONS = Object.freeze({
  [VENUE_VISIBILITY_STATUS.DRAFT]: new Set([VENUE_VISIBILITY_STATUS.PUBLISHED]),
  [VENUE_VISIBILITY_STATUS.PUBLISHED]: new Set([VENUE_VISIBILITY_STATUS.PAUSED]),
  [VENUE_VISIBILITY_STATUS.PAUSED]: new Set([VENUE_VISIBILITY_STATUS.PUBLISHED])
});

export function isPublicVenueVisibility(status) {
  return status === VENUE_VISIBILITY_STATUS.PUBLISHED;
}

export function isVenuePubliclyEligible(venue) {
  return isPublicVenueVisibility(venue?.visibilityStatus);
}

export function canTransitionVenueVisibility(currentStatus, nextStatus) {
  return Boolean(TRANSITIONS[currentStatus]?.has(nextStatus));
}

export function initialVenueVisibilityFor(origin) {
  return origin === VENUE_CREATION_ORIGIN.ACQUISITION
    ? VENUE_VISIBILITY_STATUS.DRAFT
    : VENUE_VISIBILITY_STATUS.PUBLISHED;
}

export function publicVenueWhere(extraWhere = {}) {
  return {
    ...extraWhere,
    visibilityStatus: VENUE_VISIBILITY_STATUS.PUBLISHED
  };
}

export function publicVenueRelationWhere() {
  return {
    is: {
      visibilityStatus: VENUE_VISIBILITY_STATUS.PUBLISHED
    }
  };
}
