import { api } from "./api";

export async function getAdvertiserAccounts(params = {}) {
  const { data } = await api.get("/ads/advertiser-accounts", { params });
  return data.items || [];
}

export async function getAdvertiserAccount(id) {
  const { data } = await api.get(`/ads/advertiser-accounts/${id}`);
  return data.item || null;
}
