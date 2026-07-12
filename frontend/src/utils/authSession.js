export function getAuthErrorStatus(error) {
  return Number(error?.response?.status || 0);
}

export function getAuthErrorCode(error) {
  return String(error?.response?.data?.error || "");
}

export function isDefinitiveSessionFailure(error) {
  const status = getAuthErrorStatus(error);
  const requestUrl = String(error?.config?.url || "");
  const errorCode = getAuthErrorCode(error);

  if (!requestUrl.includes("/auth/refresh")) return false;
  if (status === 401 && errorCode === "invalid_refresh_token") return true;
  return status === 400 && errorCode === "validation_error";
}

export function isTransientSessionFailure(error) {
  const status = getAuthErrorStatus(error);
  return !isDefinitiveSessionFailure(error)
    && (status === 0 || status === 401 || status === 403 || status === 408 || status === 425 || status === 429 || status >= 500);
}
