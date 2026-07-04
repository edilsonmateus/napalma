import { api } from "./api";

export async function getAdReviewQueue() {
  const { data } = await api.get("/ads/reviews/queue");
  return data;
}

export async function submitAdReview({ entityType, id }) {
  const { data } = await api.post(`/ads/reviews/${entityType}/${id}/submit`);
  return data.item;
}

export async function decideAdReview({ entityType, id, decision, reason }) {
  const { data } = await api.post(`/ads/reviews/${entityType}/${id}/${decision}`, { reason: reason || undefined });
  return data.item;
}

export async function getAdReviewHistory({ entityType, id }) {
  const { data } = await api.get(`/ads/reviews/${entityType}/${id}/history`);
  return data.items || [];
}
