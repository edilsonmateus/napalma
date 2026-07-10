import { api } from "./api";

export async function getMyAdvertiserAccounts() { const { data } = await api.get("/me/advertiser-accounts"); return data.items || []; }
export async function getMyAdvertiserAccessRequests() { const { data } = await api.get("/me/advertiser-access-requests"); return data.items || []; }
export async function requestMyAdvertiserAccess(payload) { const { data } = await api.post("/me/advertiser-access-requests", payload); return data.item; }
export async function getMyAdvertiserCampaigns(accountId) { const { data } = await api.get(`/me/advertiser-accounts/${accountId}/campaigns`); return data; }
export async function createMyAdvertiserCampaign(accountId, payload) { const { data } = await api.post(`/me/advertiser-accounts/${accountId}/campaigns`, payload); return data.item; }
export async function updateMyAdvertiserCampaign(campaignId, payload) { const { data } = await api.patch(`/me/advertiser-campaigns/${campaignId}`, payload); return data.item; }
export async function deleteMyAdvertiserCampaign(campaignId) { await api.delete(`/me/advertiser-campaigns/${campaignId}`); }
export async function endMyAdvertiserCampaign(campaignId) { const { data } = await api.post(`/me/advertiser-campaigns/${campaignId}/end`); return data.item; }
export async function duplicateMyAdvertiserCampaign(campaignId) { const { data } = await api.post(`/me/advertiser-campaigns/${campaignId}/duplicate`); return data.item; }
export async function setMyAdvertiserCampaignLifecycle(campaignId, status) { const { data } = await api.post(`/me/advertiser-campaigns/${campaignId}/lifecycle`, { status }); return data.item; }
export async function createMyAdvertiserCreative(campaignId, payload) { const { data } = await api.post(`/me/advertiser-campaigns/${campaignId}/creatives`, payload); return data.item; }
export async function submitMyAdvertiserReview(entityType, id) { const { data } = await api.post(`/me/advertiser-reviews/${entityType}/${id}/submit`); return data.item; }
export async function getMyAdvertiserWallet(accountId) { const { data } = await api.get(`/me/advertiser-accounts/${accountId}/wallet`); return data; }
export async function createMyPaymentOrder(accountId, payload) { const { data } = await api.post(`/me/advertiser-accounts/${accountId}/payment-orders`, payload); return data; }
export async function allocateMyWalletCredits(accountId, payload) { const { data } = await api.post(`/me/advertiser-accounts/${accountId}/wallet/allocate`, payload); return data.item; }
export async function getMyPaymentOrder(id) { const { data } = await api.get(`/me/advertiser-payment-orders/${id}`); return data; }
export async function processMyMockPaymentOrder(id, outcome) { const { data } = await api.post(`/me/advertiser-payment-orders/${id}/mock-process`, { outcome }); return data; }
export async function uploadMyAdvertiserCreative({ file, campaignId, slot }) {
  const body = new FormData(); body.append("file", file); body.append("campaignId", campaignId); body.append("slot", slot);
  const { data } = await api.post("/me/advertiser-uploads/creative", body, { headers: { "Content-Type": "multipart/form-data" } });
  const item = data.item || {};
  return { ...item, publicUrl: item.publicUrl || item.url || "" };
}
