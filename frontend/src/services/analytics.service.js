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

export function trackClientDiagnostic(type, payload = {}) {
  if (!type) return;
  trackAnalyticsEvent(type, {
    source: "frontend_runtime",
    metadata: {
      kind: String(payload.kind || "unknown").slice(0, 40),
      route: String(payload.route || window.location.pathname || "/").slice(0, 120),
      message: String(payload.message || "").slice(0, 120),
      online: typeof navigator === "undefined" ? true : navigator.onLine
    }
  });
}

export async function getImpactSummary(params = {}) {
  const { data } = await api.get("/analytics/impact-summary", { params });
  return data;
}
