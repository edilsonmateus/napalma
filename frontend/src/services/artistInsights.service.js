import { api } from "./api";

export async function getArtistInsights(artistId, days = 30) {
  const { data } = await api.get(`/me/artists/${artistId}/insights`, { params: { days } });
  return data.item;
}
