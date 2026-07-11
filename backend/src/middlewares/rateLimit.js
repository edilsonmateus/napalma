const buckets = new Map();
const MAX_BUCKETS = 10_000;

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

function pruneBuckets(ts) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.expiresAt <= ts) buckets.delete(key);
  }
  // Under a distributed flood, prefer bounded memory over retaining stale
  // counters forever. Normal traffic never reaches this fallback.
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function createRateLimiter({
  keyPrefix = "global",
  windowMs = 60_000,
  max = 30,
  message = "Muitas requisicoes. Tente novamente em instantes."
} = {}) {
  return (req, res, next) => {
    const ts = nowMs();
    pruneBuckets(ts);
    const key = buildKey(req, keyPrefix);
    const entry = buckets.get(key);

    if (!entry || entry.expiresAt <= ts) {
      buckets.set(key, { expiresAt: ts + windowMs, count: 1 });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.expiresAt - ts) / 1000));
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
