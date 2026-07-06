import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { isDefinitiveSessionFailure } from "../utils/authSession";

const LOCAL_API_URL = "http://localhost:3333/api";
const PRODUCTION_API_URL = "https://seven7gira-api.onrender.com/api";

function resolveApiBaseUrl() {
  const configuredUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  const unstableHosts = ["api.example.com", "api.77gira.com.br"];
  const shouldUseFallback =
    !configuredUrl || unstableHosts.some((host) => configuredUrl.includes(host));

  if (!shouldUseFallback) return configuredUrl;
  return import.meta.env.PROD ? PRODUCTION_API_URL : LOCAL_API_URL;
}

const apiBaseUrl = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: apiBaseUrl
});

const authlessApi = axios.create({
  baseURL: apiBaseUrl
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshingPromise = null;

async function rotateRefreshToken(failedAccessToken) {
  const execute = async () => {
    useAuthStore.getState().syncFromStorage({ validated: true });
    const latest = useAuthStore.getState();

    if (latest.token && latest.token !== failedAccessToken) {
      return latest.token;
    }

    const res = await authlessApi.post("/auth/refresh", { refreshToken: latest.refreshToken });
    useAuthStore.getState().setAuth({
      token: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user
    });
    return res.data.accessToken;
  };

  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("77gira-auth-refresh", execute);
  }
  return execute();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest?._retry) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    const store = useAuthStore.getState();
    if (!store.refreshToken) {
      store.clearAuth();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const failedAccessToken = store.token;

    if (!refreshingPromise) {
      refreshingPromise = rotateRefreshToken(failedAccessToken)
        .catch((refreshError) => {
          const currentStore = useAuthStore.getState();
          if (isDefinitiveSessionFailure(refreshError)) currentStore.clearAuth();
          else currentStore.setSessionStatus("degraded", "A conexão com sua sessão foi interrompida temporariamente.");
          throw refreshError;
        })
        .finally(() => {
          refreshingPromise = null;
        });
    }

    const newAccessToken = await refreshingPromise;
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  }
);
