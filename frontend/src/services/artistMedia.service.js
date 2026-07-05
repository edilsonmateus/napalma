import { api } from "./api";

export async function getMyArtistMedia(artistId) { const { data } = await api.get(`/me/artists/${artistId}/media`); return data; }
export async function createMyArtistMedia(artistId, payload) { const { data } = await api.post(`/me/artists/${artistId}/media`, payload); return data.item; }
export async function updateMyArtistMedia(id, payload) { const { data } = await api.patch(`/me/artist-media/${id}`, payload); return data.item; }
export async function deleteMyArtistMedia(id) { await api.delete(`/me/artist-media/${id}`); }
