import { api } from "./api";

export async function getVenueMenu(venueId) {
  const { data } = await api.get(`/venues/${venueId}/menu`);
  return data.item;
}
export async function getManagedVenueMenu(venueId) {
  const { data } = await api.get(`/venues/${venueId}/menu/manage`);
  return data;
}
export async function updateVenueMenu(venueId, payload) {
  const { data } = await api.patch(`/venues/${venueId}/menu`, payload);
  return data.item;
}
export async function createVenueMenuItem(venueId, payload) {
  const { data } = await api.post(`/venues/${venueId}/menu/items`, payload);
  return data.item;
}
export async function updateVenueMenuItem(venueId, itemId, payload) {
  const { data } = await api.patch(`/venues/${venueId}/menu/items/${itemId}`, payload);
  return data.item;
}
export async function reorderVenueMenuItems(venueId, items) {
  await api.patch(`/venues/${venueId}/menu/items/reorder`, { items });
}
export async function archiveVenueMenuItem(venueId, itemId) {
  await api.delete(`/venues/${venueId}/menu/items/${itemId}`);
}
export async function restoreVenueMenuItem(venueId, itemId) {
  const { data } = await api.post(`/venues/${venueId}/menu/items/${itemId}/restore`);
  return data.item;
}
export async function importVenueMenuItems(venueId, items) {
  const { data } = await api.post(`/venues/${venueId}/menu/items/import`, { items });
  return data;
}
export async function setVenueMenuInteraction(venueId, itemId, type, active) {
  const url = `/venues/${venueId}/menu/items/${itemId}/interactions/${type}`;
  if (active) await api.post(url);
  else await api.delete(url);
}
