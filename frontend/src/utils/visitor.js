const VISITOR_STORAGE_KEY = "napalma:visitor-id";

export function getOrCreateVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch (_error) {
    return `v_fallback_${Date.now().toString(36)}`;
  }
}
