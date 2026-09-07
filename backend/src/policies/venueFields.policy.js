export const VENUE_ADMIN_ONLY_FIELDS = Object.freeze(["goldPartner"]);

export function findVenueAdminOnlyFields(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  return VENUE_ADMIN_ONLY_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(input, field));
}

export function hasVenueAdminOnlyFields(input) {
  return findVenueAdminOnlyFields(input).length > 0;
}
