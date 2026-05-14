import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createArtist,
  createEvent,
  createVenue,
  deleteArtist,
  deleteEvent,
  deleteVenue,
  getVenueManagers,
  getVenueManagerUsers,
  getArtists,
  getEvents,
  getRegions,
  getVenues,
  addVenueManager,
  removeVenueManager,
  updateArtist,
  updateEvent,
  updateVenue
} from "../services/events.service";

export function useEventsQuery(filters = {}) {
  return useQuery({ queryKey: ["events", filters], queryFn: () => getEvents(filters) });
}

export function useRegionsQuery() {
  return useQuery({ queryKey: ["regions"], queryFn: getRegions });
}

export function useVenuesQuery(filters = {}) {
  return useQuery({ queryKey: ["venues", filters], queryFn: () => getVenues(filters) });
}

export function useArtistsQuery(filters = {}) {
  return useQuery({ queryKey: ["artists", filters], queryFn: () => getArtists(filters) });
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

export function useAddVenueManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ venueId, payload }) => addVenueManager(venueId, payload), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["venue-managers", variables.venueId] }); } });
}

export function useRemoveVenueManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ venueId, userId }) => removeVenueManager(venueId, userId), onSuccess: (_data, variables) => { queryClient.invalidateQueries({ queryKey: ["venue-managers", variables.venueId] }); } });
}

export function useCreateArtistMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createArtist, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["artists"] }); } });
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
