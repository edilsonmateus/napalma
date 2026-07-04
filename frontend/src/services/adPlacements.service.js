import { api } from "./api";

export async function getAdPlacements() {
  const { data } = await api.get("/ads/placements");
  return data.items || [];
}
