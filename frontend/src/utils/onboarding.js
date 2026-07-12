export const ONBOARDING_STORAGE_KEY = "77gira.has_seen_onboarding";
export const ONBOARDING_COMPLETED_EVENT = "77gira:onboarding-complete";

export function markOnboardingAsSeen() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch (_error) {
    // The navigation still works when storage is unavailable.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ONBOARDING_COMPLETED_EVENT));
  }
}
