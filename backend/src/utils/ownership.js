export function isAdmin(user) {
  return user?.role === "admin";
}

export function canManageVenue(user, venue) {
  if (!user || !venue) return false;
  if (isAdmin(user)) return true;
  if (user.role === "producer") return venue.createdByUserId === user.id;
  return false;
}

export function canManageArtist(user, artist) {
  if (!user || !artist) return false;
  if (isAdmin(user)) return true;
  if (user.role === "producer") return artist.createdByUserId === user.id;
  return false;
}

export function canManageEvent(user, event) {
  if (!user || !event) return false;
  if (isAdmin(user)) return true;
  if (user.role === "producer") return event.createdByUserId === user.id;
  if (user.role === "venue_manager") {
    const viaLegacyManager = event.venue?.managerUserId === user.id;
    const viaAccessList = (event.venue?.managerAccesses || []).some((entry) => entry.userId === user.id);
    return viaLegacyManager || viaAccessList;
  }
  return false;
}
