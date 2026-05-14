import { api } from "./api";
import { events as fallbackEvents, regions as fallbackRegions } from "../data/mockData";

export async function getEvents(params = {}) {
  try {
    const { data } = await api.get("/events", { params });
    if (!data?.items || !Array.isArray(data.items)) {
      return fallbackEvents;
    }
    return data.items;
  } catch (_error) {
    return fallbackEvents;
  }
}

export async function getEventById(id) {
  const { data } = await api.get(`/events/${id}`);
  return data.item;
}

export async function getRegions() {
  try {
    const { data } = await api.get("/regions");
    if (!data?.items || !Array.isArray(data.items)) {
      return fallbackRegions;
    }
    return data.items;
  } catch (_error) {
    return fallbackRegions;
  }
}

export async function getVenues(params = {}) {
  const { data } = await api.get("/venues", { params });
  return data.items || [];
}

export async function getVenueById(id) {
  const { data } = await api.get(`/venues/${id}`);
  return data.item;
}

export async function getVenueManagers(venueId) {
  const { data } = await api.get(`/venues/${venueId}/managers`);
  return data.items || [];
}

export async function addVenueManager(venueId, payload) {
  const { data } = await api.post(`/venues/${venueId}/managers`, payload);
  return data.item;
}

export async function removeVenueManager(venueId, userId) {
  await api.delete(`/venues/${venueId}/managers/${userId}`);
}

export async function getVenueManagerUsers(params = {}) {
  const { data } = await api.get("/users/venue-managers", { params });
  return data.items || [];
}

export async function createVenue(payload) {
  const { data } = await api.post("/venues", payload);
  return data.item;
}

export async function updateVenue(id, payload) {
  const { data } = await api.patch(`/venues/${id}`, payload);
  return data.item;
}

export async function deleteVenue(id) {
  await api.delete(`/venues/${id}`);
}

export async function getArtists(params = {}) {
  const { data } = await api.get("/artists", { params });
  return data.items || [];
}

export async function getArtistById(id) {
  const { data } = await api.get(`/artists/${id}`);
  return data.item;
}

export async function createArtist(payload) {
  const { data } = await api.post("/artists", payload);
  return data.item;
}

export async function updateArtist(id, payload) {
  const { data } = await api.patch(`/artists/${id}`, payload);
  return data.item;
}

export async function deleteArtist(id) {
  await api.delete(`/artists/${id}`);
}

export async function createEvent(payload) {
  const { data } = await api.post("/events", payload);
  return data.item;
}

export async function updateEvent(id, payload) {
  const { data } = await api.patch(`/events/${id}`, payload);
  return data.item;
}

export async function deleteEvent(id) {
  await api.delete(`/events/${id}`);
}
