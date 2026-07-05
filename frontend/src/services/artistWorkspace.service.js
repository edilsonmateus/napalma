import { api } from "./api";

export async function getMyArtists() { const { data } = await api.get("/me/artists"); return data.items || []; }
export async function getMyArtistProfile(id) { const { data } = await api.get(`/me/artists/${id}/profile`); return data.item; }
export async function updateMyArtistProfile(id, payload) { const { data } = await api.patch(`/me/artists/${id}/profile`, payload); return data.item; }
export async function uploadMyArtistImage({ artistId, file, kind }) {
  const body = new FormData(); body.append("file", file); body.append("folder", kind === "cover" ? "covers" : "artists"); body.append("name", `${artistId}-${kind}`);
  const { data } = await api.post(`/me/artists/${artistId}/uploads/image`, body, { headers: { "Content-Type": "multipart/form-data" } });
  return data.item;
}
