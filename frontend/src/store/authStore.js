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
  setAuth: ({ token, refreshToken, user }) =>
    set(() => {
      const next = { token, refreshToken, user };
      persist(next);
      return next;
    }),
  clearAuth: () =>
    set(() => {
      const next = { token: "", refreshToken: "", user: null };
      persist(next);
      return next;
    })
}));
