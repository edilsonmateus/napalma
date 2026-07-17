import { Router } from "express";
import { requireRole } from "../middlewares/rbac.js";
import { requireAuth } from "../middlewares/auth.js";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../controllers/events.controller.js";
import { request77FirstKit } from "../controllers/first77.controller.js";
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
import { devLoginAdmin, login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { createCommonUser, createProducerUser, listCommonUsers, listProducerUsers, setReservedUsernamePermission } from "../controllers/users.controller.js";
import { listMyRadar, markEventInRadar, unmarkEventFromRadar } from "../controllers/radar.controller.js";
import { listMyHistory, markEventAsAttended, unmarkEventAsAttended } from "../controllers/history.controller.js";
import { listMyAchievements } from "../controllers/achievements.controller.js";
import { createPelaHora, deletePelaHora, getPelaHoraById, listPelaHora, suggestPelaHora } from "../controllers/pelaHora.controller.js";
import {
  createAdCampaign,
  createAdCreative,
  getAdsActivity,
  getAdDelivery,
  getAdsHealth,
  getAdsReport,
  getVenueAdsSummary,
  listAdCampaigns,
  redirectDeliveredClick,
  trackAdClick,
  trackDeliveredImpression,
  trackAdImpression,
  updateAdCampaign,
  updateAdCreative
} from "../controllers/ads.controller.js";
import { getAudienceSummary, trackAudienceVisit } from "../controllers/audience.controller.js";
import { getImpactSummary, trackAnalyticsEvent } from "../controllers/analytics.controller.js";
import {
  activateToNaPista,
  deactivateToNaPista,
  deliverToNaPistaSuggestion,
  getPushStatus,
  getToNaPistaStatus,
  sendTestPush,
  subscribePush,
  unsubscribePush
} from "../controllers/push.controller.js";
import {
  createAcquisitionInteraction,
  createAcquisitionLead,
  deleteAcquisitionLead,
  listAcquisitionLeads,
  updateAcquisitionLead
} from "../controllers/acquisition.controller.js";
import { createClaimRequest, decideClaim, listClaims, listMyClaims } from "../controllers/claims.controller.js";
import { uploadImage } from "../controllers/uploads.controller.js";
import { imageUpload } from "../middlewares/upload.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import { requireFeatureFlag } from "../middlewares/featureFlags.js";
import { requireAdvertiserCampaignWrite } from "../middlewares/advertiserAccess.js";
import { requireArtistWrite } from "../middlewares/artistAccess.js";
import { getArtistEpk, getMyArtistProfile, listMyArtists, updateMyArtistProfile } from "../controllers/artistEpk.controller.js";
import { createArtistBookingRequest, listArtistBookingRequests, updateArtistBookingStatus } from "../controllers/artistBookings.controller.js";
import { createArtistMedia, deleteArtistMedia, listMyArtistMedia, updateArtistMedia } from "../controllers/artistMedia.controller.js";
import { revokeMySessions, updateMyLocation, updateMyPassword, updateMyProfile, uploadMyAvatar } from "../controllers/profile.controller.js";
import { getArtistInsights } from "../controllers/artistInsights.controller.js";
import { listAdPlacements } from "../controllers/adPlacements.controller.js";
import { uploadAdCreativeAsset } from "../controllers/adCreativeUploads.controller.js";
import {
  createAdvertiserAccount,
  createAdvertiserMembership,
  getAdvertiserAccount,
  listAdvertiserAccounts,
  listAdvertiserMemberships,
  approveAdvertiserAccessRequest,
  rejectAdvertiserAccessRequest,
  revokeAdvertiserMembership,
  setCampaignAdvertiserAccount,
  updateAdvertiserAccount,
  updateAdvertiserMembership
} from "../controllers/advertiserAccounts.controller.js";
import { approveAdReview, getAdReviewHistory, listAdReviewQueue, rejectAdReview, requestAdReviewChanges, submitAdReview } from "../controllers/adReviews.controller.js";
import { createMyAdvertiserCampaign, createMyAdvertiserCreative, deleteMyAdvertiserCampaign, duplicateMyAdvertiserCampaign, endMyAdvertiserCampaign, listMyAdvertiserAccessRequests, listMyAdvertiserAccounts, listMyAdvertiserCampaigns, requestMyAdvertiserAccess, setMyAdvertiserCampaignLifecycle, submitMyAdvertiserReview, updateMyAdvertiserCampaign, updateMyAdvertiserCreative } from "../controllers/advertiserPortal.controller.js";
import { decideMyArtistInvitation, inviteArtistTeamMember, listArtistTeam, listMyArtistInvitations, revokeArtistTeamMember, updateArtistTeamMember } from "../controllers/artistTeam.controller.js";
import { allocateMyWalletCredits, createMyPaymentOrder, getAdsBillingOperations, getMyAdvertiserWallet, getMyPaymentOrder, processAdminMockPaymentOrder, processMyMockPaymentOrder } from "../controllers/adPayments.controller.js";
import { createMyDeletionRequest, createMyPrivacyRequest, exportMyPrivacyData, getMyPrivacyOverview, getPrivacyRetentionPreviewForAdmin, getSecurityReadinessForAdmin, listAuditLogs, listPrivacyRequests, setMyPrivacyConsent, updatePrivacyRequest } from "../controllers/privacy.controller.js";
import {
  addVenueMenuInteraction,
  archiveVenueMenuItem,
  createVenueMenuItem,
  importVenueMenuItems,
  getManagedVenueMenu,
  getPublicVenueMenu,
  removeVenueMenuInteraction,
  reorderVenueMenuItems,
  restoreVenueMenuItem,
  updateVenueMenu,
  updateVenueMenuItem
} from "../controllers/venueMenus.controller.js";

export const router = Router();

const canManageEvents = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const canManageCatalog = [requireAuth, requireRole(["admin", "producer"])];
const canManageHouseOps = [requireAuth, requireRole(["admin", "venue_manager"])];
const canReviewClaims = [requireAuth, requireRole(["admin"])];
const canManageAds = [requireAuth, requireRole(["admin"])];
const canManageAdvertiserAccounts = [
  ...canManageAds,
  requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED")
];
const canViewAdPlacementCatalog = [
  ...canManageAds,
  requireFeatureFlag("ADS_PLACEMENT_CATALOG_ENABLED")
];
const canUploadAdCreativeToR2 = [
  ...canManageAds,
  requireFeatureFlag("ADS_R2_CREATIVE_UPLOAD_ENABLED")
];
const canManageAdReviews = [...canManageAds, requireFeatureFlag("ADS_REVIEW_WORKFLOW_ENABLED")];
const canManageAcquisition = [requireAuth, requireRole(["admin"])];
const canUploadImages = [requireAuth, requireRole(["admin", "producer", "venue_manager"])];
const canManageVenueMenus = [requireAuth, requireRole(["admin", "producer", "venue_manager"]), requireFeatureFlag("VENUE_MENU_ENABLED")];
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
  max: 60,
  message: "Muitas interacoes de anuncio no momento. Aguarde alguns segundos."
});
const menuInteractionLimiter = createRateLimiter({
  keyPrefix: "menu-interaction",
  windowMs: 60_000,
  max: 30,
  message: "Muitas interacoes no cardapio. Aguarde um instante."
});
const adsDeliveryLimiter = createRateLimiter({
  keyPrefix: "ads-delivery",
  windowMs: 60_000,
  max: 60,
  message: "Muitas solicitacoes de anuncio no momento. Aguarde alguns segundos."
});
const paymentLimiter = createRateLimiter({
  keyPrefix: "ads-payment",
  windowMs: 60_000,
  max: 12,
  message: "Muitas operacoes de pagamento em pouco tempo. Aguarde um minuto."
});
const artistBookingLimiter = createRateLimiter({ keyPrefix: "artist-booking", windowMs: 60_000, max: 8, message: "Muitas solicitacoes enviadas. Aguarde um minuto." });
const analyticsTrackLimiter = createRateLimiter({
  keyPrefix: "analytics-track",
  windowMs: 60_000,
  max: 240,
  message: "Muitas interacoes no momento. Aguarde alguns segundos."
});
const pushLimiter = createRateLimiter({
  keyPrefix: "push",
  windowMs: 60_000,
  max: 30,
  message: "Muitas atualizacoes de notificacao no momento. Aguarde alguns segundos."
});
const privacyRequestLimiter = createRateLimiter({
  keyPrefix: "privacy-request",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Muitas solicitações de privacidade em pouco tempo. Aguarde antes de tentar novamente."
});
const privacySensitiveActionLimiter = createRateLimiter({
  keyPrefix: "privacy-sensitive-action",
  windowMs: 24 * 60 * 60 * 1000,
  max: 2,
  message: "Por segurança, aguarde antes de repetir esta operação de privacidade."
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/dev/admin", authLimiter, devLoginAdmin);
router.post("/auth/refresh", authLimiter, refresh);
router.post("/auth/logout", authLimiter, logout);
router.get("/auth/me", requireAuth, me);
router.post("/me/profile/avatar", requireAuth, uploadLimiter, imageUpload.single("file"), uploadMyAvatar);
router.patch("/me/profile", requireAuth, updateMyProfile);
router.patch("/me/profile/location", requireAuth, updateMyLocation);
router.patch("/me/profile/password", requireAuth, authLimiter, updateMyPassword);
router.post("/me/security/revoke-sessions", requireAuth, privacySensitiveActionLimiter, revokeMySessions);
router.get("/me/privacy", requireAuth, getMyPrivacyOverview);
router.post("/me/privacy/consents/:purpose", requireAuth, privacyRequestLimiter, setMyPrivacyConsent);
router.post("/me/privacy/requests", requireAuth, privacyRequestLimiter, createMyPrivacyRequest);
router.post("/me/privacy/export", requireAuth, privacySensitiveActionLimiter, exportMyPrivacyData);
router.post("/me/privacy/deletion-request", requireAuth, privacySensitiveActionLimiter, createMyDeletionRequest);
router.get("/admin/privacy-requests", requireAuth, requireRole(["admin"]), listPrivacyRequests);
router.patch("/admin/privacy-requests/:id", requireAuth, requireRole(["admin"]), updatePrivacyRequest);
router.get("/admin/privacy-retention/preview", requireAuth, requireRole(["admin"]), getPrivacyRetentionPreviewForAdmin);
router.get("/admin/audit-logs", requireAuth, requireRole(["admin"]), listAuditLogs);
router.get("/admin/security-readiness", requireAuth, requireRole(["admin"]), getSecurityReadinessForAdmin);
router.get("/admin/users", requireAuth, requireRole(["admin"]), listCommonUsers);
router.post("/admin/users", requireAuth, requireRole(["admin"]), authLimiter, createCommonUser);
router.patch("/admin/users/:id/reserved-username-permission", requireAuth, requireRole(["admin"]), setReservedUsernamePermission);
router.post("/analytics/visit", trackAudienceVisit);
router.post("/analytics/events", analyticsTrackLimiter, trackAnalyticsEvent);
router.get("/analytics/audience-summary", requireAuth, requireRole(["admin", "producer", "venue_manager"]), getAudienceSummary);
router.get("/analytics/impact-summary", requireAuth, requireRole(["admin", "producer", "venue_manager"]), getImpactSummary);
router.post("/push/subscribe", pushLimiter, subscribePush);
router.post("/push/unsubscribe", pushLimiter, unsubscribePush);
router.get("/push/status", getPushStatus);
router.post("/push/to-na-pista/activate", requireAuth, pushLimiter, activateToNaPista);
router.post("/push/to-na-pista/deactivate", pushLimiter, deactivateToNaPista);
router.get("/push/to-na-pista/status", pushLimiter, getToNaPistaStatus);
router.post("/push/to-na-pista/notify", pushLimiter, deliverToNaPistaSuggestion);
router.post("/push/test", requireAuth, requireRole(["admin"]), pushLimiter, sendTestPush);
router.get("/acquisition/leads", ...canManageAcquisition, listAcquisitionLeads);
router.post("/acquisition/leads", ...canManageAcquisition, createAcquisitionLead);
router.patch("/acquisition/leads/:id", ...canManageAcquisition, updateAcquisitionLead);
router.delete("/acquisition/leads/:id", ...canManageAcquisition, deleteAcquisitionLead);
router.post("/acquisition/leads/:id/interactions", ...canManageAcquisition, createAcquisitionInteraction);
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
router.get("/me/advertiser-accounts", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), listMyAdvertiserAccounts);
router.get("/me/advertiser-access-requests", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), listMyAdvertiserAccessRequests);
router.post("/me/advertiser-access-requests", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), requestMyAdvertiserAccess);
router.get("/me/advertiser-accounts/:accountId/campaigns", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), listMyAdvertiserCampaigns);
router.post("/me/advertiser-accounts/:accountId/campaigns", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), createMyAdvertiserCampaign);
router.patch("/me/advertiser-campaigns/:campaignId", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), updateMyAdvertiserCampaign);
router.delete("/me/advertiser-campaigns/:campaignId", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), deleteMyAdvertiserCampaign);
router.post("/me/advertiser-campaigns/:campaignId/end", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), endMyAdvertiserCampaign);
router.post("/me/advertiser-campaigns/:campaignId/duplicate", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), duplicateMyAdvertiserCampaign);
router.post("/me/advertiser-campaigns/:campaignId/lifecycle", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), setMyAdvertiserCampaignLifecycle);
router.post("/me/advertiser-campaigns/:campaignId/creatives", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), createMyAdvertiserCreative);
router.patch("/me/advertiser-creatives/:creativeId", requireAuth, requireFeatureFlag("ADS_ADVERTISER_ACCOUNTS_ENABLED"), updateMyAdvertiserCreative);
router.post("/me/advertiser-reviews/:entityType/:id/submit", requireAuth, requireFeatureFlag("ADS_REVIEW_WORKFLOW_ENABLED"), submitMyAdvertiserReview);
router.get("/me/advertiser-accounts/:accountId/wallet", requireAuth, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), getMyAdvertiserWallet);
router.post("/me/advertiser-accounts/:accountId/payment-orders", requireAuth, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), paymentLimiter, createMyPaymentOrder);
router.post("/me/advertiser-accounts/:accountId/wallet/allocate", requireAuth, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), paymentLimiter, allocateMyWalletCredits);
router.get("/me/advertiser-payment-orders/:id", requireAuth, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), getMyPaymentOrder);
router.post("/me/advertiser-payment-orders/:id/mock-process", requireAuth, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), paymentLimiter, processMyMockPaymentOrder);
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
router.post("/events/:id/77first", ...canManageEvents, request77FirstKit);
router.get("/regions", listRegions);
router.get("/admin/regions", ...canReviewClaims, listRegionsAdmin);
router.post("/admin/regions", ...canReviewClaims, createRegion);
router.patch("/admin/regions/:id", ...canReviewClaims, updateRegion);
router.delete("/admin/regions/:id", ...canReviewClaims, deleteRegion);
router.get("/venues", listVenues);
router.get("/venues/:id", getVenueById);
router.get("/venues/:id/menu", requireFeatureFlag("VENUE_MENU_ENABLED"), getPublicVenueMenu);
router.get("/venues/:id/menu/manage", ...canManageVenueMenus, getManagedVenueMenu);
router.patch("/venues/:id/menu", ...canManageVenueMenus, updateVenueMenu);
router.post("/venues/:id/menu/items", ...canManageVenueMenus, createVenueMenuItem);
router.post("/venues/:id/menu/items/import", ...canManageVenueMenus, importVenueMenuItems);
router.patch("/venues/:id/menu/items/reorder", ...canManageVenueMenus, reorderVenueMenuItems);
router.patch("/venues/:id/menu/items/:itemId", ...canManageVenueMenus, updateVenueMenuItem);
router.delete("/venues/:id/menu/items/:itemId", ...canManageVenueMenus, archiveVenueMenuItem);
router.post("/venues/:id/menu/items/:itemId/restore", ...canManageVenueMenus, restoreVenueMenuItem);
router.post("/venues/:id/menu/items/:itemId/interactions/:type", requireAuth, requireFeatureFlag("VENUE_MENU_INTERACTIONS_ENABLED"), menuInteractionLimiter, addVenueMenuInteraction);
router.delete("/venues/:id/menu/items/:itemId/interactions/:type", requireAuth, requireFeatureFlag("VENUE_MENU_INTERACTIONS_ENABLED"), menuInteractionLimiter, removeVenueMenuInteraction);
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
router.get("/artist-epk/:ref", getArtistEpk);
router.post("/artist-bookings", requireFeatureFlag("ARTIST_BOOKING_REQUESTS_ENABLED"), artistBookingLimiter, createArtistBookingRequest);
router.post("/artists/:id/follow", requireAuth, followArtist);
router.delete("/artists/:id/follow", requireAuth, unfollowArtist);
router.post("/uploads/image", ...canUploadImages, uploadLimiter, imageUpload.single("file"), uploadImage);
router.post("/ads/uploads/creative", ...canUploadAdCreativeToR2, uploadLimiter, imageUpload.single("file"), uploadAdCreativeAsset);
router.post("/me/advertiser-uploads/creative", requireAuth, requireFeatureFlag("ADS_R2_CREATIVE_UPLOAD_ENABLED"), uploadLimiter, imageUpload.single("file"), requireAdvertiserCampaignWrite, uploadAdCreativeAsset);
router.post("/artists", ...canManageCatalog, createArtist);
router.patch("/artists/:id", ...canManageCatalog, updateArtist);
router.delete("/artists/:id", ...canManageCatalog, deleteArtist);
router.get("/me/artists", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), listMyArtists);
router.get("/me/artists/:id/profile", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), getMyArtistProfile);
router.patch("/me/artists/:id/profile", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), updateMyArtistProfile);
router.get("/me/artists/:artistId/team", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), listArtistTeam);
router.post("/me/artists/:artistId/team", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), inviteArtistTeamMember);
router.patch("/me/artist-team/:id", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), updateArtistTeamMember);
router.delete("/me/artist-team/:id", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), revokeArtistTeamMember);
router.get("/me/artist-invitations", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), listMyArtistInvitations);
router.patch("/me/artist-invitations/:id", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), decideMyArtistInvitation);
router.post("/me/artists/:artistId/uploads/image", requireAuth, requireFeatureFlag("ARTIST_SELF_SERVICE_ENABLED"), uploadLimiter, imageUpload.single("file"), requireArtistWrite, uploadImage);
router.get("/me/artists/:artistId/bookings", requireAuth, requireFeatureFlag("ARTIST_BOOKING_REQUESTS_ENABLED"), listArtistBookingRequests);
router.patch("/me/artist-bookings/:id/status", requireAuth, requireFeatureFlag("ARTIST_BOOKING_REQUESTS_ENABLED"), updateArtistBookingStatus);
router.get("/me/artists/:artistId/media", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED"), listMyArtistMedia);
router.post("/me/artists/:artistId/media", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED"), createArtistMedia);
router.patch("/me/artist-media/:id", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED"), updateArtistMedia);
router.delete("/me/artist-media/:id", requireAuth, requireFeatureFlag("ARTIST_MEDIA_GALLERY_ENABLED"), deleteArtistMedia);
router.get("/me/artists/:artistId/insights", requireAuth, requireFeatureFlag("ARTIST_INSIGHTS_ENABLED"), getArtistInsights);
router.get("/ads/slots/:slot/delivery", adsDeliveryLimiter, getAdDelivery);
router.post("/ads/deliveries/:token/impression", adsTrackLimiter, trackDeliveredImpression);
router.get("/ads/deliveries/:token/click", adsTrackLimiter, redirectDeliveredClick);
router.post("/ads/track/impression", adsTrackLimiter, trackAdImpression);
router.post("/ads/track/click", adsTrackLimiter, trackAdClick);
router.get("/ads/report", ...canManageAds, getAdsReport);
router.get("/ads/health", ...canManageAds, getAdsHealth);
router.get("/ads/placements", ...canViewAdPlacementCatalog, listAdPlacements);
router.get("/ads/activity", ...canManageAds, getAdsActivity);
router.get("/ads/venue-summary", requireAuth, requireRole(["admin", "venue_manager"]), getVenueAdsSummary);
router.get("/ads/campaigns", ...canManageAds, listAdCampaigns);
router.post("/ads/campaigns", ...canManageAds, createAdCampaign);
router.patch("/ads/campaigns/:id", ...canManageAds, updateAdCampaign);
router.post("/ads/campaigns/:campaignId/creatives", ...canManageAds, createAdCreative);
router.patch("/ads/creatives/:id", ...canManageAds, updateAdCreative);
router.get("/ads/reviews/queue", ...canManageAdReviews, listAdReviewQueue);
router.get("/ads/reviews/:entityType/:id/history", ...canManageAdReviews, getAdReviewHistory);
router.post("/ads/reviews/:entityType/:id/submit", ...canManageAdReviews, submitAdReview);
router.post("/ads/reviews/:entityType/:id/approve", ...canManageAdReviews, approveAdReview);
router.post("/ads/reviews/:entityType/:id/request-changes", ...canManageAdReviews, requestAdReviewChanges);
router.post("/ads/reviews/:entityType/:id/reject", ...canManageAdReviews, rejectAdReview);
router.get("/ads/advertiser-accounts", ...canManageAdvertiserAccounts, listAdvertiserAccounts);
router.get("/ads/advertiser-accounts/:id", ...canManageAdvertiserAccounts, getAdvertiserAccount);
router.post("/ads/advertiser-accounts", ...canManageAdvertiserAccounts, createAdvertiserAccount);
router.patch("/ads/advertiser-accounts/:id", ...canManageAdvertiserAccounts, updateAdvertiserAccount);
router.post("/ads/advertiser-accounts/:id/approve-access", ...canManageAdvertiserAccounts, approveAdvertiserAccessRequest);
router.post("/ads/advertiser-accounts/:id/reject-access", ...canManageAdvertiserAccounts, rejectAdvertiserAccessRequest);
router.get("/ads/advertiser-accounts/:accountId/memberships", ...canManageAdvertiserAccounts, listAdvertiserMemberships);
router.post("/ads/advertiser-accounts/:accountId/memberships", ...canManageAdvertiserAccounts, createAdvertiserMembership);
router.patch("/ads/advertiser-memberships/:id", ...canManageAdvertiserAccounts, updateAdvertiserMembership);
router.delete("/ads/advertiser-memberships/:id", ...canManageAdvertiserAccounts, revokeAdvertiserMembership);
router.patch("/ads/campaigns/:id/advertiser-account", ...canManageAdvertiserAccounts, setCampaignAdvertiserAccount);
router.get("/ads/billing", ...canManageAds, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), getAdsBillingOperations);
router.post("/ads/payment-orders/:id/mock-process", ...canManageAds, requireFeatureFlag("ADS_CREDITS_PURCHASE_ENABLED"), paymentLimiter, processAdminMockPaymentOrder);
