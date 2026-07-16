import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveVenueMenuItem, createVenueMenuItem,
  getManagedVenueMenu, getVenueMenu, importVenueMenuItems, reorderVenueMenuItems, restoreVenueMenuItem,
  setVenueMenuInteraction, updateVenueMenu, updateVenueMenuItem
} from "../services/venueMenus.service";

export function useVenueMenuQuery(venueId, enabled = true) {
  return useQuery({ queryKey: ["venue-menu", venueId], queryFn: () => getVenueMenu(venueId), enabled: enabled && Boolean(venueId), retry: false });
}
export function useManagedVenueMenuQuery(venueId, enabled = true) {
  return useQuery({ queryKey: ["venue-menu-manage", venueId], queryFn: () => getManagedVenueMenu(venueId), enabled: enabled && Boolean(venueId) });
}
function useMenuMutation(mutationFn) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: (_data, variables) => {
    client.invalidateQueries({ queryKey: ["venue-menu", variables.venueId] });
    client.invalidateQueries({ queryKey: ["venue-menu-manage", variables.venueId] });
  } });
}
export function useUpdateVenueMenuMutation() { return useMenuMutation(({ venueId, payload }) => updateVenueMenu(venueId, payload)); }
export function useCreateVenueMenuItemMutation() { return useMenuMutation(({ venueId, payload }) => createVenueMenuItem(venueId, payload)); }
export function useUpdateVenueMenuItemMutation() { return useMenuMutation(({ venueId, itemId, payload }) => updateVenueMenuItem(venueId, itemId, payload)); }
export function useReorderVenueMenuItemsMutation() { return useMenuMutation(({ venueId, items }) => reorderVenueMenuItems(venueId, items)); }
export function useArchiveVenueMenuItemMutation() { return useMenuMutation(({ venueId, itemId }) => archiveVenueMenuItem(venueId, itemId)); }
export function useRestoreVenueMenuItemMutation() { return useMenuMutation(({ venueId, itemId }) => restoreVenueMenuItem(venueId, itemId)); }
export function useImportVenueMenuItemsMutation() { return useMenuMutation(({ venueId, items }) => importVenueMenuItems(venueId, items)); }
export function useVenueMenuInteractionMutation() { return useMenuMutation(({ venueId, itemId, type, active }) => setVenueMenuInteraction(venueId, itemId, type, active)); }
