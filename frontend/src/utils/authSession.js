export function getAuthErrorStatus(error) {
  return Number(error?.response?.status || 0);
}

export function isDefinitiveSessionFailure(error) {
  const status = getAuthErrorStatus(error);
  const requestUrl = String(error?.config?.url || "");

  if (status === 401 || status === 403) return true;
  return status === 400 && requestUrl.includes("/auth/refresh");
}

export function isTransientSessionFailure(error) {
  const status = getAuthErrorStatus(error);
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}
