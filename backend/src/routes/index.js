import { Router } from "express";
import { requireRole } from "../middlewares/rbac.js";
import { requireAuth } from "../middlewares/auth.js";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../controllers/events.controller.js";
import { listRegions } from "../controllers/regions.controller.js";
import {
  addVenueManager,
  createVenue,
  deleteVenue,
  getVenueById,
  listVenueManagers,
  listVenues,
  removeVenueManager,
  updateVenue
} from "../controllers/venues.controller.js";
import {
  createArtist,
  deleteArtist,
  followArtist,
  getArtistById,
  getArtistProfile,
  listArtists,
  unfollowArtist,
  updateArtist
} from "../controllers/artists.controller.js";
import { login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { createVenueManagerUser, listVenueManagerUsers } from "../controllers/users.controller.js";
import { listMyRadar, markEventInRadar, unmarkEventFromRadar } from "../controllers/radar.controller.js";
import { listMyHistory, markEventAsAttended, unmarkEventAsAttended } from "../controllers/history.controller.js";
import { listMyAchievements } from "../controllers/achievements.controller.js";
import { createPelaHora, deletePelaHora, getPelaHoraById, listPelaHora, suggestPelaHora } from "../controllers/pelaHora.controller.js";
import {
  createAdCampaign,
  createAdCreative,
  getAdsActivity,
  getAdDelivery,
  getAdsReport,
  getVenueAdsSummary,
  listAdCampaigns,
  trackAdClick,
  trackAdImpression,
  updateAdCampaign,
  updateAdCreative
} from "../controllers/ads.controller.js";
import { getAudienceSummary, trackAudienceVisit } from "../controllers/audience.controller.js";
import { createClaimRequest, decideClaim, listClaims, listMyClaims } from "../controllers/claims.controller.js";

export const router = Router();

const canManageEvents = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const canManageCatalog = [requireAuth, requireRole(["admin", "producer"])];
const canReviewClaims = [requireAuth, requireRole(["admin"])];
const canManageAds = [requireAuth, requireRole(["admin"])];

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", logout);
router.get("/auth/me", requireAuth, me);
router.post("/analytics/visit", trackAudienceVisit);
router.get("/analytics/audience-summary", ...canManageCatalog, getAudienceSummary);
router.get("/me/claims", requireAuth, listMyClaims);
router.post("/me/claims", requireAuth, createClaimRequest);
router.get("/claims", ...canReviewClaims, listClaims);
router.patch("/claims/:id/decision", ...canReviewClaims, decideClaim);
router.get("/me/radar", requireAuth, listMyRadar);
router.post("/me/radar/:eventId", requireAuth, markEventInRadar);
router.delete("/me/radar/:eventId", requireAuth, unmarkEventFromRadar);
router.get("/me/history", requireAuth, listMyHistory);
router.post("/me/history/:eventId", requireAuth, markEventAsAttended);
router.delete("/me/history/:eventId", requireAuth, unmarkEventAsAttended);
router.get("/me/achievements", requireAuth, listMyAchievements);
router.get("/me/pela-hora", requireAuth, listPelaHora);
router.get("/me/pela-hora/suggest", requireAuth, suggestPelaHora);
router.get("/me/pela-hora/:id", requireAuth, getPelaHoraById);
router.post("/me/pela-hora", requireAuth, createPelaHora);
router.delete("/me/pela-hora/:id", requireAuth, deletePelaHora);
router.get("/users/venue-managers", ...canManageCatalog, listVenueManagerUsers);
router.post("/users/venue-managers", ...canReviewClaims, createVenueManagerUser);

router.get("/events", listEvents);
router.get("/events/:id", getEventById);
router.post("/events", ...canManageEvents, createEvent);
router.patch("/events/:id", ...canManageEvents, updateEvent);
router.delete("/events/:id", ...canManageEvents, deleteEvent);
router.get("/regions", listRegions);
router.get("/venues", listVenues);
router.get("/venues/:id", getVenueById);
router.post("/venues", ...canManageCatalog, createVenue);
router.patch("/venues/:id", ...canManageCatalog, updateVenue);
router.delete("/venues/:id", ...canManageCatalog, deleteVenue);
router.get("/venues/:id/managers", ...canManageCatalog, listVenueManagers);
router.post("/venues/:id/managers", ...canManageCatalog, addVenueManager);
router.delete("/venues/:id/managers/:userId", ...canManageCatalog, removeVenueManager);
router.get("/artists", listArtists);
router.get("/artists/:id", getArtistById);
router.get("/artists/:id/profile", getArtistProfile);
router.post("/artists/:id/follow", requireAuth, followArtist);
router.delete("/artists/:id/follow", requireAuth, unfollowArtist);
router.post("/artists", ...canManageCatalog, createArtist);
router.patch("/artists/:id", ...canManageCatalog, updateArtist);
router.delete("/artists/:id", ...canManageCatalog, deleteArtist);
router.get("/ads/slots/:slot/delivery", getAdDelivery);
router.post("/ads/track/impression", trackAdImpression);
router.post("/ads/track/click", trackAdClick);
router.get("/ads/report", ...canManageAds, getAdsReport);
router.get("/ads/activity", ...canManageAds, getAdsActivity);
router.get("/ads/venue-summary", requireAuth, requireRole(["admin", "venue_manager"]), getVenueAdsSummary);
router.get("/ads/campaigns", ...canManageAds, listAdCampaigns);
router.post("/ads/campaigns", ...canManageAds, createAdCampaign);
router.patch("/ads/campaigns/:id", ...canManageAds, updateAdCampaign);
router.post("/ads/campaigns/:campaignId/creatives", ...canManageAds, createAdCreative);
router.patch("/ads/creatives/:id", ...canManageAds, updateAdCreative);
