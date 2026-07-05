export function isAdmin(user) {
  return user?.role === "admin";
}

export function isProducer(user) {
  return user?.role === "producer";
}

export function isVenueManager(user) {
  return user?.role === "venue_manager";
}

export function canManageVenue(user, venue) {
  if (!user || !venue) return false;
  if (isAdmin(user)) return true;

  if (isProducer(user)) {
    const viaCreator = venue.createdByUserId === user.id;
    const viaProducerAccess = (venue.producerAccesses || []).some((entry) => entry.producerId === user.id);
    return viaCreator || viaProducerAccess;
  }

  if (isVenueManager(user)) {
    const viaLegacyManager = venue.managerUserId === user.id;
    const viaAccessList = (venue.managerAccesses || []).some((entry) => entry.userId === user.id);
    return viaLegacyManager || viaAccessList;
  }

  return false;
}

export function canManageArtist(user, artist) {
  if (!user || !artist) return false;
  if (isAdmin(user)) return true;

  if (isProducer(user)) {
    const viaCreator = artist.createdByUserId === user.id;
    const viaProducerAccess = (artist.producerAccesses || []).some((entry) => entry.producerId === user.id);
    const viaArtistAccess = (artist.accesses || []).some((entry) => entry.userId === user.id && entry.status === "active" && ["owner", "manager", "editor"].includes(entry.role));
    return viaCreator || viaProducerAccess || viaArtistAccess;
  }

  return (artist.accesses || []).some((entry) => entry.userId === user.id && entry.status === "active" && ["owner", "manager", "editor"].includes(entry.role));
}

export function canManageEvent(user, event) {
  if (!user || !event) return false;
  if (isAdmin(user)) return true;

  if (isProducer(user)) {
    const viaCreator = event.createdByUserId === user.id;
    const viaVenueAccess = (event.venue?.producerAccesses || []).some((entry) => entry.producerId === user.id);
    const viaArtistAccess = (event.artists || []).some((eventArtist) =>
      (eventArtist.artist?.producerAccesses || []).some((entry) => entry.producerId === user.id)
    );
    return viaCreator || viaVenueAccess || viaArtistAccess;
  }

  if (isVenueManager(user)) {
    const viaCreator = event.createdByUserId === user.id;
    const viaLegacyManager = event.venue?.managerUserId === user.id;
    const viaAccessList = (event.venue?.managerAccesses || []).some((entry) => entry.userId === user.id);
    return viaCreator || viaLegacyManager || viaAccessList;
  }

  return false;
}
