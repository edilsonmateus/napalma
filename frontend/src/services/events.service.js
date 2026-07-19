import { api } from "./api";
import {
  events as fallbackEvents,
  regions as fallbackRegions,
  venues as fallbackVenues
} from "../data/mockData";

const allowMockFallback =
  import.meta.env.VITE_ENABLE_API_FALLBACK_MOCKS === "true" ||
  !import.meta.env.PROD;

export async function getEvents(params = {}) {
  try {
    const { data } = await api.get("/events", { params });
    if (!data?.items || !Array.isArray(data.items)) {
      if (allowMockFallback) return fallbackEvents;
      throw new Error("invalid_events_response");
    }
    return data.items;
  } catch (error) {
    if (allowMockFallback) return fallbackEvents;
    throw error;
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
      if (allowMockFallback) return fallbackRegions;
      throw new Error("invalid_regions_response");
    }
    return data.items;
  } catch (error) {
    if (allowMockFallback) return fallbackRegions;
    throw error;
  }
}

export async function getAdminRegions(params = {}) {
  const { data } = await api.get("/admin/regions", { params });
  return data.items || [];
}

export async function createRegion(payload) {
  const { data } = await api.post("/admin/regions", payload);
  return data.item;
}

export async function updateRegion(id, payload) {
  const { data } = await api.patch(`/admin/regions/${id}`, payload);
  return data.item;
}

export async function deleteRegion(id) {
  await api.delete(`/admin/regions/${id}`);
}

export async function uploadImageFile({ file, folder = "general", name = "" }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  if (name) formData.append("name", name);
  const { data } = await api.post("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data.item;
}

export async function getVenues(params = {}) {
  try {
    const { data } = await api.get("/venues", { params });
    if (!data?.items || !Array.isArray(data.items)) {
      if (allowMockFallback) return fallbackVenues;
      throw new Error("invalid_venues_response");
    }
    return data.items;
  } catch (error) {
    if (allowMockFallback) return fallbackVenues;
    throw error;
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

export async function revokeMyVenueAccess(venueId) {
  await api.delete(`/venues/${venueId}/my-access`);
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
  try {
    const { data } = await api.get(`/artist-epk/${id}`);
    return data.item;
  } catch (error) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id);
    const canFallbackToLegacyProfile = isUuid && [404, 501].includes(error?.response?.status);
    if (!canFallbackToLegacyProfile) throw error;
    const { data } = await api.get(`/artists/${id}/profile`);
    return data.item;
  }
}

export async function getOperationsVenues(params = {}) {
  const { data } = await api.get("/admin/operations/venues", { params });
  return data.items || [];
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

export async function request77FirstKit(id) {
  const { data } = await api.post(`/events/${id}/77first`);
  return data;
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

const ADS_SESSION_KEY = "77gira:ads-session";

export function getAdsSessionId() {
  const stored = localStorage.getItem(ADS_SESSION_KEY);
  if (stored) return stored;
  const next = `${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  localStorage.setItem(ADS_SESSION_KEY, next);
  return next;
}

export async function getAdDelivery(slot, context = {}) {
  const { data } = await api.get(`/ads/slots/${slot}/delivery`, {
    params: { sessionId: getAdsSessionId(), ...context }
  });
  return data.item || null;
}

export async function trackDeliveredImpression(token, payload) {
  const { data } = await api.post(`/ads/deliveries/${encodeURIComponent(token)}/impression`, {
    sessionId: getAdsSessionId(),
    ...payload
  });
  return data;
}

export function getAdClickUrl(token) {
  return `${apiBaseUrl}/ads/deliveries/${encodeURIComponent(token)}/click`;
}

export async function getAdsReport(days = 30) {
  const { data } = await api.get("/ads/report", { params: { days } });
  return data;
}

export async function getAdsHealth(hours = 24) {
  const { data } = await api.get("/ads/health", { params: { hours } });
  return data;
}

export async function getAdsActivity(limit = 25) {
  const { data } = await api.get("/ads/activity", { params: { limit } });
  return data.items || [];
}

export async function getAdsBillingOperations() {
  const { data } = await api.get("/ads/billing");
  return data.item;
}

export async function processAdminMockPaymentOrder(id, outcome) {
  const { data } = await api.post(`/ads/payment-orders/${id}/mock-process`, { outcome });
  return data.item;
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

export async function getAudienceSummary(params = {}) {
  const { data } = await api.get("/analytics/audience-summary", { params });
  return data;
}

export async function getAcquisitionLeads(params = {}) {
  const { data } = await api.get("/acquisition/leads", { params });
  return data;
}

export async function createAcquisitionLead(payload) {
  const { data } = await api.post("/acquisition/leads", payload);
  return data.item;
}

export async function updateAcquisitionLead(id, payload) {
  const { data } = await api.patch(`/acquisition/leads/${id}`, payload);
  return data.item;
}

export async function deleteAcquisitionLead(id) {
  await api.delete(`/acquisition/leads/${id}`);
}

export async function createAcquisitionInteraction(leadId, payload) {
  const { data } = await api.post(`/acquisition/leads/${leadId}/interactions`, payload);
  return data.item;
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

export async function getAcquisitionAnalytics(params = {}) {
  const { data } = await api.get("/acquisition/analytics", { params });
  return data;
}

export async function getAcquisitionLeadTimeline(id) {
  const { data } = await api.get(`/acquisition/leads/${id}/timeline`);
  return data;
}

export async function getOperationsClaims(params = {}) {
  const { data } = await api.get("/admin/operations/claims", { params });
  return data.items || [];
}

export async function getOperationsClaimDetail(id) {
  const { data } = await api.get(`/admin/operations/claims/${id}`);
  return data.item;
}
