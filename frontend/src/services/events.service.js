import { api } from "./api";
import {
  events as fallbackEvents,
  regions as fallbackRegions,
  venues as fallbackVenues
} from "../data/mockData";

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
  try {
    const { data } = await api.get("/venues", { params });
    if (!data?.items || !Array.isArray(data.items)) {
      return fallbackVenues;
    }
    return data.items;
  } catch (_error) {
    return fallbackVenues;
  }
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

export async function createVenueManagerUser(payload) {
  const { data } = await api.post("/users/venue-managers", payload);
  return data.item;
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

export async function getArtistProfile(id) {
  const { data } = await api.get(`/artists/${id}/profile`);
  return data.item;
}

export async function followArtist(id) {
  await api.post(`/artists/${id}/follow`);
}

export async function unfollowArtist(id) {
  await api.delete(`/artists/${id}/follow`);
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

export async function getMyRadar() {
  const { data } = await api.get("/me/radar");
  return data.items || [];
}

export async function markEventInRadar(eventId) {
  const { data } = await api.post(`/me/radar/${eventId}`);
  return data;
}

export async function unmarkEventFromRadar(eventId) {
  await api.delete(`/me/radar/${eventId}`);
}

export async function getMyHistory() {
  const { data } = await api.get("/me/history");
  return data.items || [];
}

export async function markEventAsAttended(eventId) {
  const { data } = await api.post(`/me/history/${eventId}`);
  return data;
}

export async function unmarkEventAsAttended(eventId) {
  await api.delete(`/me/history/${eventId}`);
}

export async function getMyAchievements() {
  const { data } = await api.get("/me/achievements");
  return data.items || [];
}

export async function getAdCampaigns() {
  const { data } = await api.get("/ads/campaigns");
  return data.items || [];
}

export async function createAdCampaign(payload) {
  const { data } = await api.post("/ads/campaigns", payload);
  return data.item;
}

export async function updateAdCampaign(id, payload) {
  const { data } = await api.patch(`/ads/campaigns/${id}`, payload);
  return data.item;
}

export async function createAdCreative(campaignId, payload) {
  const { data } = await api.post(`/ads/campaigns/${campaignId}/creatives`, payload);
  return data.item;
}

export async function updateAdCreative(id, payload) {
  const { data } = await api.patch(`/ads/creatives/${id}`, payload);
  return data.item;
}

export async function getAdDelivery(slot) {
  const { data } = await api.get(`/ads/slots/${slot}/delivery`);
  return data.item || null;
}

export async function getAdsReport(days = 30) {
  const { data } = await api.get("/ads/report", { params: { days } });
  return data;
}

export async function getAdsActivity(limit = 25) {
  const { data } = await api.get("/ads/activity", { params: { limit } });
  return data.items || [];
}

export async function getVenueAdsSummary(params = {}) {
  const { data } = await api.get("/ads/venue-summary", { params });
  return data;
}

export async function trackAdImpression(payload) {
  await api.post("/ads/track/impression", payload);
}

export async function trackAdClick(payload) {
  await api.post("/ads/track/click", payload);
}

export async function getMyPelaHora() {
  const { data } = await api.get("/me/pela-hora");
  return data.items || [];
}

export async function getPelaHoraSuggestion(params) {
  const { data } = await api.get("/me/pela-hora/suggest", { params });
  return data.suggestion || null;
}

export async function createPelaHora(payload) {
  const { data } = await api.post("/me/pela-hora", payload);
  return data.item;
}

export async function deletePelaHora(id) {
  await api.delete(`/me/pela-hora/${id}`);
}

export async function trackAudienceVisit(payload) {
  const { data } = await api.post("/analytics/visit", payload);
  return data;
}

export async function getAudienceSummary() {
  const { data } = await api.get("/analytics/audience-summary");
  return data;
}

export async function getMyClaims() {
  const { data } = await api.get("/me/claims");
  return data.items || [];
}

export async function createClaim(payload) {
  const { data } = await api.post("/me/claims", payload);
  return data.item;
}

export async function getClaims(status) {
  const { data } = await api.get("/claims", { params: status ? { status } : {} });
  return data.items || [];
}

export async function decideClaim(id, payload) {
  const { data } = await api.patch(`/claims/${id}/decision`, payload);
  return data.item;
}
