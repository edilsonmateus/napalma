/**
 * Small dependency-free HTTP baseline. These headers are intentionally applied
 * by the API only, avoiding a CSP that could accidentally break the frontend
 * while still protecting API and local upload responses.
 */
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}
