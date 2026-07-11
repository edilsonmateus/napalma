function shorten(value, max = 500) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/**
 * Emits only operational diagnostics. Request bodies, headers, credentials,
 * access tokens and raw database errors must never be logged here.
 */
export function logSafeError(error, req) {
  const detail = {
    requestId: req?.requestId || null,
    name: shorten(error?.name, 80) || "Error",
    code: error?.code ? shorten(error.code, 80) : null,
    message: shorten(error?.message, 500) || "Unexpected error"
  };
  if (process.env.NODE_ENV !== "production" && error?.stack) detail.stack = shorten(error.stack, 2000);
  console.error("api_error", detail);
}
