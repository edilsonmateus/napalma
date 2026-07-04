import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdPlacements } from "../services/adPlacements.service";
import { uploadAdCreativeAsset } from "../services/adCreativeAssets.service";
import { decideAdReview, getAdReviewHistory, getAdReviewQueue, submitAdReview } from "../services/adReviews.service";
import {
  createAdvertiserAccount,
  createAdvertiserMembership,
  getAdvertiserAccount,
  getAdvertiserAccounts,
  revokeAdvertiserMembership,
  setCampaignAdvertiserAccount,
  updateAdvertiserAccount,
  updateAdvertiserMembership
} from "../services/advertiserAccounts.service";
import {
  createArtist,
  createAdCampaign,
  createClaim,
  createVenueManagerUser,
  createAdCreative,
  createAcquisitionInteraction,
  createAcquisitionLead,
  createRegion,
  createEvent,
  createVenue,
  deleteAcquisitionLead,
  deleteArtist,
  deleteEvent,
  deleteVenue,
  deleteRegion,
  getVenueManagers,
  getVenueManagerUsers,
  getArtists,
  getArtistProfile,
  getAdCampaigns,
  getAcquisitionLeads,
  getAdminRegions,
  getAdsActivity,
  getVenueAdsSummary,
  getAudienceSummary,
  getClaims,
  getAdDelivery,
  getAdsReport,
  getMyAchievements,
  getMyPelaHora,
  getEvents,
  getMyClaims,
  getMyHistory,
  getMyRadar,
  getRegions,
  getVenues,
  trackAudienceVisit,
  decideClaim,
  getPelaHoraSuggestion,
  markEventAsAttended,
  markEventInRadar,
  addVenueManager,
  removeVenueManager,
  revokeMyVenueAccess,
  followArtist,
  unfollowArtist,
  createPelaHora,
  deletePelaHora,
  unmarkEventAsAttended,
  unmarkEventFromRadar,
  updateArtist,
  updateAdCampaign,
  updateAdCreative,
  updateAcquisitionLead,
  updateEvent,
  updateVenue,
  updateRegion,
  uploadImageFile
} from "../services/events.service";

export function useEventsQuery(filters = {}) {
  return useQuery({ queryKey: ["events", filters], queryFn: () => getEvents(filters) });
}

export function useRegionsQuery() {
  return useQuery({ queryKey: ["regions"], queryFn: getRegions });
}

export function useAdminRegionsQuery(params = {}, enabled = true) {
  return useQuery({ queryKey: ["admin-regions", params], queryFn: () => getAdminRegions(params), enabled });
}

export function useMyRadarQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-radar"],
    queryFn: getMyRadar,
    enabled
  });
}

export function useMyHistoryQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-history"],
    queryFn: getMyHistory,
    enabled
  });
}

export function useMyAchievementsQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-achievements"],
    queryFn: getMyAchievements,
    enabled
  });
}

export function useMyPelaHoraQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-pela-hora"],
    queryFn: getMyPelaHora,
    enabled
  });
}

export function useVenuesQuery(filters = {}) {
  return useQuery({ queryKey: ["venues", filters], queryFn: () => getVenues(filters) });
}

export function useArtistsQuery(filters = {}) {
  return useQuery({ queryKey: ["artists", filters], queryFn: () => getArtists(filters) });
}

export function useArtistProfileQuery(artistId) {
  return useQuery({
    queryKey: ["artist-profile", artistId],
    queryFn: () => getArtistProfile(artistId),
    enabled: Boolean(artistId)
  });
}

export function useAdCampaignsQuery(enabled = true) {
  return useQuery({ queryKey: ["ad-campaigns"], queryFn: getAdCampaigns, enabled });
}

export function useAdReviewQueueQuery(enabled = true) {
  return useQuery({ queryKey: ["ad-review-queue"], queryFn: getAdReviewQueue, enabled });
}

export function useAdReviewHistoryQuery(entityType, id, enabled = true) {
  return useQuery({ queryKey: ["ad-review-history", entityType, id], queryFn: () => getAdReviewHistory({ entityType, id }), enabled: enabled && Boolean(entityType && id) });
}

function reviewMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["ad-review-queue"] });
    queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["ad-review-history"] });
  } });
}

export function useSubmitAdReviewMutation() { return reviewMutation(submitAdReview); }
export function useDecideAdReviewMutation() { return reviewMutation(decideAdReview); }

export function useAdvertiserAccountsQuery(params = {}, enabled = true) {
  return useQuery({
    queryKey: ["advertiser-accounts", params],
    queryFn: () => getAdvertiserAccounts(params),
    enabled
  });
}

export function useAdPlacementsQuery(enabled = true) {
  return useQuery({ queryKey: ["ad-placements"], queryFn: getAdPlacements, enabled });
}

export function useUploadAdCreativeAssetMutation() {
  return useMutation({ mutationFn: uploadAdCreativeAsset });
}

export function useAdvertiserAccountQuery(id, enabled = true) {
  return useQuery({
    queryKey: ["advertiser-account", id],
    queryFn: () => getAdvertiserAccount(id),
    enabled: Boolean(id) && enabled
  });
}

export function useCreateAdvertiserAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdvertiserAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advertiser-accounts"] })
  });
}

export function useUpdateAdvertiserAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAdvertiserAccount(id, payload),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["advertiser-account", item.id] });
    }
  });
}

export function useCreateAdvertiserMembershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, payload }) => createAdvertiserMembership(accountId, payload),
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["advertiser-account", variables.accountId] });
    }
  });
}

export function useUpdateAdvertiserMembershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAdvertiserMembership(id, payload),
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-account", variables.accountId] });
    }
  });
}

export function useRevokeAdvertiserMembershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => revokeAdvertiserMembership(id),
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advertiser-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["advertiser-account", variables.accountId] });
    }
  });
}

export function useSetCampaignAdvertiserAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, accountId }) => setCampaignAdvertiserAccount(campaignId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["advertiser-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["advertiser-account"] });
    }
  });
}

export function useAdDeliveryQuery(slot, enabled = true) {
  return useQuery({
    queryKey: ["ad-delivery", slot],
    queryFn: () => getAdDelivery(slot),
    enabled: Boolean(slot) && enabled
  });
}

export function useAdsReportQuery(days = 30, enabled = true) {
  return useQuery({
    queryKey: ["ads-report", days],
    queryFn: () => getAdsReport(days),
    enabled
  });
}

export function useAdsActivityQuery(limit = 25, enabled = true) {
  return useQuery({
    queryKey: ["ads-activity", limit],
    queryFn: () => getAdsActivity(limit),
    enabled
  });
}

export function useVenueAdsSummaryQuery(params = {}, enabled = true) {
  return useQuery({
    queryKey: ["ads-venue-summary", params],
    queryFn: () => getVenueAdsSummary(params),
    enabled
  });
}

export function useAudienceSummaryQuery(params = {}, enabled = true) {
  return useQuery({
    queryKey: ["audience-summary", params],
    queryFn: () => getAudienceSummary(params),
    enabled
  });
}

export function useAcquisitionLeadsQuery(params = {}, enabled = true) {
  return useQuery({
    queryKey: ["acquisition-leads", params],
    queryFn: () => getAcquisitionLeads(params),
    enabled
  });
}

export function useMyClaimsQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-claims"],
    queryFn: getMyClaims,
    enabled
  });
}

export function useClaimsQuery(status, enabled = true) {
  return useQuery({
    queryKey: ["claims", status || "all"],
    queryFn: () => getClaims(status),
    enabled
  });
}

export function usePelaHoraSuggestionQuery(params, enabled = true) {
  return useQuery({
    queryKey: ["pela-hora-suggestion", params],
    queryFn: () => getPelaHoraSuggestion(params),
    enabled
  });
}

export function useVenueManagersQuery(venueId) {
  return useQuery({ queryKey: ["venue-managers", venueId], queryFn: () => getVenueManagers(venueId), enabled: Boolean(venueId) });
}

export function useVenueManagerUsersQuery(search) {
  return useQuery({
    queryKey: ["venue-manager-users", search],
    queryFn: () => getVenueManagerUsers(search ? { q: search } : {}),
    enabled: Boolean(search && search.trim().length >= 2)
  });
}

export function useCreateVenueMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createVenue, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["venues"] }); queryClient.invalidateQueries({ queryKey: ["regions"] }); } });
}

export function useUpdateVenueMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }) => updateVenue(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["venues"] }); queryClient.invalidateQueries({ queryKey: ["regions"] }); } });
}

export function useDeleteVenueMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteVenue, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["venues"] }); queryClient.invalidateQueries({ queryKey: ["regions"] }); } });
}

export function useCreateRegionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRegion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    }
  });
}

export function useUpdateRegionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateRegion(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    }
  });
}

export function useDeleteRegionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRegion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-regions"] });
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    }
  });
}

export function useUploadImageMutation() {
  return useMutation({
    mutationFn: uploadImageFile
  });
}

export function useAddVenueManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ venueId, payload }) => addVenueManager(venueId, payload), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["venue-managers", variables.venueId] }); } });
}

export function useCreateVenueManagerUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVenueManagerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-manager-users"] });
    }
  });
}

export function useRemoveVenueManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ venueId, userId }) => removeVenueManager(venueId, userId), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["venue-managers", variables.venueId] }); } });
}

export function useRevokeMyVenueAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeMyVenueAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    }
  });
}

export function useCreateArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createArtist, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["artists"] }); } });
}

export function useCreateAdCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createAdCampaign, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] }); } });
}

export function useCreateAcquisitionLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAcquisitionLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-leads"] });
    }
  });
}

export function useUpdateAcquisitionLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAcquisitionLead(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-leads"] });
    }
  });
}

export function useDeleteAcquisitionLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAcquisitionLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-leads"] });
    }
  });
}

export function useCreateAcquisitionInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }) => createAcquisitionInteraction(leadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquisition-leads"] });
    }
  });
}

export function useUpdateAdCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }) => updateAdCampaign(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] }); } });
}

export function useCreateAdCreativeMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ campaignId, payload }) => createAdCreative(campaignId, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] }); } });
}

export function useUpdateAdCreativeMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }) => updateAdCreative(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] }); } });
}

export function useUpdateArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }) => updateArtist(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["artists"] }); } });
}

export function useDeleteArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteArtist, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["artists"] }); } });
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createEvent, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); } });
}

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }) => updateEvent(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); } });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteEvent, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["events"] }); } });
}

export function useCreatePelaHoraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPelaHora,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pela-hora"] });
    }
  });
}

export function useDeletePelaHoraMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePelaHora,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pela-hora"] });
    }
  });
}

export function useToggleRadarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, currentlyMarked }) => {
      if (currentlyMarked) {
        await unmarkEventFromRadar(eventId);
        return { unlockedAchievements: [] };
      } else {
        return markEventInRadar(eventId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-radar"] });
      queryClient.invalidateQueries({ queryKey: ["my-achievements"] });
    }
  });
}

export function useToggleHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, currentlyMarked }) => {
      if (currentlyMarked) {
        await unmarkEventAsAttended(eventId);
        return { unlockedAchievements: [] };
      } else {
        return markEventAsAttended(eventId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-history"] });
      queryClient.invalidateQueries({ queryKey: ["my-achievements"] });
    }
  });
}

export function useToggleArtistFollowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ artistId, currentlyFollowing }) => {
      if (currentlyFollowing) {
        await unfollowArtist(artistId);
      } else {
        await followArtist(artistId);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["artist-profile", variables.artistId] });
    }
  });
}

export function useTrackAudienceVisitMutation() {
  return useMutation({
    mutationFn: trackAudienceVisit
  });
}

export function useCreateClaimMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    }
  });
}

export function useDecideClaimMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => decideClaim(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });
}
