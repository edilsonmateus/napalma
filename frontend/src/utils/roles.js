export function isProducerRole(role) {
  return role === "producer" || role === "produtor";
}

export function isVenueRole(role) {
  return role === "venue_manager" || role === "casa";
}

export function isAdminRole(role) {
  return role === "admin";
}

export function getRoleHome(role) {
  if (isAdminRole(role)) return "/settings/venues";
  if (isProducerRole(role)) return "/workspace/produtor";
  if (isVenueRole(role)) return "/settings/venues?section=overview";
  return "/explore";
}
