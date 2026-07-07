import { api } from "./api";

export async function getAdvertiserAccounts(params = {}) {
  const { data } = await api.get("/ads/advertiser-accounts", { params });
  return data.items || [];
}

export async function getAdvertiserAccount(id) {
  const { data } = await api.get(`/ads/advertiser-accounts/${id}`);
  return data.item || null;
}

export async function createAdvertiserAccount(payload) {
  const { data } = await api.post("/ads/advertiser-accounts", payload);
  return data.item;
}

export async function updateAdvertiserAccount(id, payload) {
  const { data } = await api.patch(`/ads/advertiser-accounts/${id}`, payload);
  return data.item;
}

export async function approveAdvertiserAccessRequest(id) {
  const { data } = await api.post(`/ads/advertiser-accounts/${id}/approve-access`);
  return data.item;
}

export async function rejectAdvertiserAccessRequest(id, payload = {}) {
  const { data } = await api.post(`/ads/advertiser-accounts/${id}/reject-access`, payload);
  return data.item;
}

export async function createAdvertiserMembership(accountId, payload) {
  const { data } = await api.post(`/ads/advertiser-accounts/${accountId}/memberships`, payload);
  return data.item;
}

export async function updateAdvertiserMembership(id, payload) {
  const { data } = await api.patch(`/ads/advertiser-memberships/${id}`, payload);
  return data.item;
}

export async function revokeAdvertiserMembership(id) {
  const { data } = await api.delete(`/ads/advertiser-memberships/${id}`);
  return data.item;
}

export async function setCampaignAdvertiserAccount(campaignId, accountId) {
  const { data } = await api.patch(`/ads/campaigns/${campaignId}/advertiser-account`, { accountId });
  return data.item;
}
