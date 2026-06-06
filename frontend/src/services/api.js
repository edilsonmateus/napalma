import axios from "axios";
import { useAuthStore } from "../store/authStore";

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;

    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const store = useAuthStore.getState();
    if (!store.refreshToken) {
      store.clearAuth();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshingPromise) {
      refreshingPromise = authlessApi
        .post("/auth/refresh", { refreshToken: store.refreshToken })
        .then((res) => {
          useAuthStore.getState().setAuth({
            token: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            user: res.data.user
          });
          return res.data.accessToken;
        })
        .catch((refreshError) => {
          useAuthStore.getState().clearAuth();
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
