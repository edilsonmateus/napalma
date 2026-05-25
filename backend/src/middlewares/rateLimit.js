const buckets = new Map();

function nowMs() {
  return Date.now();
}

function buildKey(req, keyPrefix = "global") {
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${keyPrefix}:${ip}`;
}

export function createRateLimiter({
  keyPrefix = "global",
  windowMs = 60_000,
  max = 30,
  message = "Muitas requisicoes. Tente novamente em instantes."
} = {}) {
  return (req, res, next) => {
    const key = buildKey(req, keyPrefix);
    const entry = buckets.get(key);
    const ts = nowMs();

    if (!entry || ts - entry.start >= windowMs) {
      buckets.set(key, { start: ts, count: 1 });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (ts - entry.start)) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "too_many_requests",
        message
      });
    }

    entry.count += 1;
    buckets.set(key, entry);
    return next();
  };
}

