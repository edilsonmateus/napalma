import { api } from "./api";
import { getOrCreateVisitorId } from "../utils/visitor";

export function trackAnalyticsEvent(type, payload = {}) {
  if (!type) return;
  const body = {
    type,
    visitorId: getOrCreateVisitorId(),
    ...payload
  };

  api.post("/analytics/events", body).catch(() => {
    // Analytics must never block the user journey.
  });
}

export async function getImpactSummary(params = {}) {
  const { data } = await api.get("/analytics/impact-summary", { params });
  return data;
}
