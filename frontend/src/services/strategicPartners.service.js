import { publicApi } from "./api";

export async function listPublicStrategicPartners() {
  const { data } = await publicApi.get("/strategic-partners");
  return data.items || [];
}
