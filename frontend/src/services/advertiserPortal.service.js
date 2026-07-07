import { api } from "./api";

export async function getMyAdvertiserAccounts() { const { data } = await api.get("/me/advertiser-accounts"); return data.items || []; }
export async function getMyAdvertiserAccessRequests() { const { data } = await api.get("/me/advertiser-access-requests"); return data.items || []; }
export async function requestMyAdvertiserAccess(payload) { const { data } = await api.post("/me/advertiser-access-requests", payload); return data.item; }
export async function getMyAdvertiserCampaigns(accountId) { const { data } = await api.get(`/me/advertiser-accounts/${accountId}/campaigns`); return data; }
export async function createMyAdvertiserCampaign(accountId, payload) { const { data } = await api.post(`/me/advertiser-accounts/${accountId}/campaigns`, payload); return data.item; }
export async function createMyAdvertiserCreative(campaignId, payload) { const { data } = await api.post(`/me/advertiser-campaigns/${campaignId}/creatives`, payload); return data.item; }
export async function submitMyAdvertiserReview(entityType, id) { const { data } = await api.post(`/me/advertiser-reviews/${entityType}/${id}/submit`); return data.item; }
export async function uploadMyAdvertiserCreative({ file, campaignId, slot }) {
  const body = new FormData(); body.append("file", file); body.append("campaignId", campaignId); body.append("slot", slot);
  const { data } = await api.post("/me/advertiser-uploads/creative", body, { headers: { "Content-Type": "multipart/form-data" } }); return data.item;
}
