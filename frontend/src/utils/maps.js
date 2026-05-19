function compactAddress(parts) {
  return parts
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function getVenueAddressString(eventOrVenue) {
  if (!eventOrVenue) return "";
  if (eventOrVenue.address) {
    return compactAddress([
      eventOrVenue.address,
      eventOrVenue.city,
      eventOrVenue.state
    ]);
  }
  return compactAddress([
    eventOrVenue.venueAddress,
    eventOrVenue.venueCity,
    eventOrVenue.venueState,
    eventOrVenue.venue,
    eventOrVenue.region
  ]);
}

export function buildGoogleMapsLink(eventOrVenue) {
  const address = getVenueAddressString(eventOrVenue);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function buildWazeLink(eventOrVenue) {
  const address = getVenueAddressString(eventOrVenue);
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function buildUberLink(eventOrVenue) {
  const address = getVenueAddressString(eventOrVenue);
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(address)}`;
}
