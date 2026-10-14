const buckets = new Map();

export function checkRateLimit(scope, key, { limit = 12, windowMs = 60_000 } = {}) {
  const bucketKey = String(scope || "global") + ":" + String(key || "anonymous");
  const now = Date.now();
  let record = buckets.get(bucketKey);
  if (!record || now - record.startedAt >= windowMs) {
    record = { startedAt: now, count: 0 };
  }
  record.count += 1;
  buckets.set(bucketKey, record);
  const remaining = Math.max(0, limit - record.count);
  const retryAfterMs = Math.max(0, windowMs - (now - record.startedAt));
  return { allowed: record.count <= limit, remaining, retryAfterMs, limit, windowMs };
}

export function resetRateLimits() { buckets.clear(); }
