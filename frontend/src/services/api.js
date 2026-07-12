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

export const apiBaseUrl = resolveApiBaseUrl();
export const apiHealthUrl = apiBaseUrl.replace(/\/api$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

const authlessApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
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
const SESSION_DIAGNOSTIC_KEY = "77gira:last-session-diagnostic";

function recordSessionDiagnostic(reason) {
  try {
    sessionStorage.setItem(SESSION_DIAGNOSTIC_KEY, JSON.stringify({
      reason,
      at: new Date().toISOString(),
      route: window.location.pathname,
      online: navigator.onLine
    }));
  } catch (_error) {
    // Diagnostics must never affect the session flow.
  }
}

function clearSession(reason) {
  recordSessionDiagnostic(reason);
  useAuthStore.getState().clearAuth();
}

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

async function recoverFromAnotherContext({ failedAccessToken, attemptedRefreshToken }) {
  useAuthStore.getState().syncFromStorage({ validated: true });
  const latest = useAuthStore.getState();

  if (latest.token && latest.token !== failedAccessToken) return latest.token;
  if (!latest.refreshToken || latest.refreshToken === attemptedRefreshToken) return "";

  try {
    return await rotateRefreshToken(failedAccessToken);
  } catch (_error) {
    return "";
  }
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
      useAuthStore.getState().setSessionStatus(
        "degraded",
        "Não foi possível confirmar sua sessão agora. Vamos tentar novamente sem encerrar sua conta."
      );
      recordSessionDiagnostic("retry_after_refresh_returned_401");
      return Promise.reject(error);
    }

    const store = useAuthStore.getState();
    if (!store.refreshToken) {
      clearSession("missing_refresh_token");
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const failedAccessToken = store.token;
    const attemptedRefreshToken = store.refreshToken;

    if (!refreshingPromise) {
      refreshingPromise = rotateRefreshToken(failedAccessToken)
        .catch(async (refreshError) => {
          const recoveredToken = await recoverFromAnotherContext({ failedAccessToken, attemptedRefreshToken });
          if (recoveredToken) return recoveredToken;

          const currentStore = useAuthStore.getState();
          if (isDefinitiveSessionFailure(refreshError)) {
            // A second tab or the installed PWA may have completed the token
            // rotation milliseconds before this failed request reaches us.
            await new Promise((resolve) => window.setTimeout(resolve, 250));
            const lateRecoveredToken = await recoverFromAnotherContext({ failedAccessToken, attemptedRefreshToken });
            if (lateRecoveredToken) return lateRecoveredToken;
            clearSession("confirmed_invalid_refresh_token");
          } else {
            currentStore.setSessionStatus("degraded", "A conexão com sua sessão foi interrompida temporariamente.");
            recordSessionDiagnostic("refresh_temporarily_unavailable");
          }
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
