import { create } from "zustand";

const AUTH_STORAGE_KEY = "napalma:auth";

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: "", refreshToken: "", user: null };
    return JSON.parse(raw);
  } catch (_error) {
    return { token: "", refreshToken: "", user: null };
  }
}

const initial = loadAuth();
const initialStatus = initial.token ? "checking" : "anonymous";

function persist(state) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ token: state.token, refreshToken: state.refreshToken, user: state.user })
  );
}

export const useAuthStore = create((set) => ({
  token: initial.token || "",
  refreshToken: initial.refreshToken || "",
  user: initial.user || null,
  sessionStatus: initialStatus,
  sessionMessage: "",
  setAuth: ({ token, refreshToken, user }) =>
    set(() => {
      const next = { token, refreshToken, user, sessionStatus: "authenticated", sessionMessage: "" };
      persist(next);
      return next;
    }),
  setSessionStatus: (sessionStatus, sessionMessage = "") => set({ sessionStatus, sessionMessage }),
  syncFromStorage: ({ validated = false } = {}) =>
    set(() => {
      const stored = loadAuth();
      return {
        token: stored.token || "",
        refreshToken: stored.refreshToken || "",
        user: stored.user || null,
        sessionStatus: stored.token ? (validated ? "authenticated" : "checking") : "anonymous",
        sessionMessage: ""
      };
    }),
  clearAuth: () =>
    set(() => {
      const next = { token: "", refreshToken: "", user: null, sessionStatus: "anonymous", sessionMessage: "" };
      persist(next);
      return next;
    })
}));

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      useAuthStore.getState().syncFromStorage({ validated: true });
    }
  });
}
