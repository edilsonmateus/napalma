import { Router } from "express";
import { requireRole } from "../middlewares/rbac.js";
import { requireAuth } from "../middlewares/auth.js";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../controllers/events.controller.js";
import { createRegion, deleteRegion, listRegions, listRegionsAdmin, updateRegion } from "../controllers/regions.controller.js";
import {
  addVenueProducer,
  createVenue,
  deleteVenue,
  getVenueById,
  listVenueProducers,
  listVenues,
  removeVenueManager,
  removeVenueProducer,
  revokeMyVenueAccess,
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
import { createProducerUser, listProducerUsers } from "../controllers/users.controller.js";
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
import { uploadImage } from "../controllers/uploads.controller.js";
import { imageUpload } from "../middlewares/upload.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";

export const router = Router();

const canManageEvents = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const canManageCatalog = [requireAuth, requireRole(["admin", "producer"])];
const canManageHouseOps = [requireAuth, requireRole(["admin", "venue_manager"])];
const canReviewClaims = [requireAuth, requireRole(["admin"])];
const canManageAds = [requireAuth, requireRole(["admin"])];
const canUploadImages = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const authLimiter = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 60_000,
  max: 8,
  message: "Muitas tentativas de autenticacao. Aguarde 1 minuto."
});
const claimsLimiter = createRateLimiter({
  keyPrefix: "claims",
  windowMs: 60_000,
  max: 15,
  message: "Muitas solicitacoes de reivindicacao. Aguarde 1 minuto."
});
const uploadLimiter = createRateLimiter({
  keyPrefix: "uploads",
  windowMs: 60_000,
  max: 20,
  message: "Muitos uploads em pouco tempo. Aguarde 1 minuto."
});
const adsTrackLimiter = createRateLimiter({
  keyPrefix: "ads-track",
  windowMs: 60_000,
  max: 120,
  message: "Muitas interacoes de anuncio no momento. Aguarde alguns segundos."
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/refresh", authLimiter, refresh);
router.post("/auth/logout", authLimiter, logout);
router.get("/auth/me", requireAuth, me);
router.post("/analytics/visit", trackAudienceVisit);
router.get("/analytics/audience-summary", requireAuth, requireRole(["admin", "producer", "venue_manager"]), getAudienceSummary);
router.get("/me/claims", requireAuth, listMyClaims);
router.post("/me/claims", requireAuth, claimsLimiter, createClaimRequest);
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
router.get("/users/producers", ...canManageHouseOps, listProducerUsers);
router.post("/users/producers", ...canManageHouseOps, createProducerUser);
router.get("/users/venue-managers", ...canManageHouseOps, listProducerUsers);
router.post("/users/venue-managers", ...canManageHouseOps, createProducerUser);

router.get("/events", listEvents);
router.get("/events/:id", getEventById);
router.post("/events", ...canManageEvents, createEvent);
router.patch("/events/:id", ...canManageEvents, updateEvent);
router.delete("/events/:id", ...canManageEvents, deleteEvent);
router.get("/regions", listRegions);
router.get("/admin/regions", ...canReviewClaims, listRegionsAdmin);
router.post("/admin/regions", ...canReviewClaims, createRegion);
router.patch("/admin/regions/:id", ...canReviewClaims, updateRegion);
router.delete("/admin/regions/:id", ...canReviewClaims, deleteRegion);
router.get("/venues", listVenues);
router.get("/venues/:id", getVenueById);
router.post("/venues", ...canManageCatalog, createVenue);
router.patch("/venues/:id", ...canManageCatalog, updateVenue);
router.delete("/venues/:id", ...canManageCatalog, deleteVenue);
router.get("/venues/:id/producers", ...canManageHouseOps, listVenueProducers);
router.post("/venues/:id/producers", ...canManageHouseOps, addVenueProducer);
router.delete("/venues/:id/producers/:userId", ...canManageHouseOps, removeVenueProducer);
router.get("/venues/:id/managers", ...canManageHouseOps, listVenueProducers);
router.post("/venues/:id/managers", ...canManageHouseOps, addVenueProducer);
router.delete("/venues/:id/managers/:userId", ...canManageHouseOps, removeVenueManager);
router.delete("/venues/:id/my-access", requireAuth, requireRole(["venue_manager"]), revokeMyVenueAccess);
router.get("/artists", listArtists);
router.get("/artists/:id", getArtistById);
router.get("/artists/:id/profile", getArtistProfile);
router.post("/artists/:id/follow", requireAuth, followArtist);
router.delete("/artists/:id/follow", requireAuth, unfollowArtist);
router.post("/uploads/image", ...canUploadImages, uploadLimiter, imageUpload.single("file"), uploadImage);
router.post("/artists", ...canManageCatalog, createArtist);
router.patch("/artists/:id", ...canManageCatalog, updateArtist);
router.delete("/artists/:id", ...canManageCatalog, deleteArtist);
router.get("/ads/slots/:slot/delivery", getAdDelivery);
router.post("/ads/track/impression", adsTrackLimiter, trackAdImpression);
router.post("/ads/track/click", adsTrackLimiter, trackAdClick);
router.get("/ads/report", ...canManageAds, getAdsReport);
router.get("/ads/activity", ...canManageAds, getAdsActivity);
router.get("/ads/venue-summary", requireAuth, requireRole(["admin", "venue_manager"]), getVenueAdsSummary);
router.get("/ads/campaigns", ...canManageAds, listAdCampaigns);
router.post("/ads/campaigns", ...canManageAds, createAdCampaign);
router.patch("/ads/campaigns/:id", ...canManageAds, updateAdCampaign);
router.post("/ads/campaigns/:campaignId/creatives", ...canManageAds, createAdCreative);
router.patch("/ads/creatives/:id", ...canManageAds, updateAdCreative);
