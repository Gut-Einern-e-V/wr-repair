type RateLimit = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MAX_ENTRIES = 10_000;
const entries = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function clearExpiredEntries(now: number) {
  for (const [key, value] of entries) {
    if (value.resetAt <= now) {
      entries.delete(key);
    }
  }
}

export function rateLimit(request: Request, namespace: string, { limit, windowMs }: RateLimit): RateLimitResult {
  const now = Date.now();
  if (entries.size >= MAX_ENTRIES) {
    clearExpiredEntries(now);
  }

  const key = `${namespace}:${getClientIp(request)}`;
  const existing = entries.get(key);
  if (!existing || existing.resetAt <= now) {
    if (entries.size >= MAX_ENTRIES) {
      return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
    }

    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1_000)) };
}

