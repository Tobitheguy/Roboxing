/**
 * Best-effort in-memory rate limiting.
 *
 * Per serverless instance, so it is a speed bump rather than a wall — a
 * distributed attacker hitting many instances gets many buckets. It exists to
 * stop the cheap cases: a stuck client in a retry loop, a script hammering one
 * endpoint, someone guessing the admin password. Anything beyond that is
 * Vercel's WAF's job, not ours.
 *
 * Deliberately not Redis. Adding a fourth external service to a POC to rate
 * limit a login nobody has found yet is the wrong trade.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Stops the map growing without bound on a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

/**
 * Caller IP, from Vercel's forwarding headers.
 *
 * Takes the FIRST entry of x-forwarded-for. The list is appended to by each
 * proxy, so later entries are attacker-controllable; on Vercel the first is
 * the one the platform observed.
 */
export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

/**
 * The same lookup, from a bare Headers object.
 *
 * Server Actions never see a Request — they get the incoming headers through
 * `headers()` from next/headers instead. Without this they would have to
 * re-implement the x-forwarded-for parsing, and the copy that gets the
 * "take the FIRST entry" detail wrong is the one an attacker can spoof.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
