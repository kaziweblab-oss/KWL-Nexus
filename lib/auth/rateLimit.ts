// Shared in-memory rate limiter for auth endpoints (per-key sliding window).
// Single-instance safe with periodic cleanup. For multi-instance production behind
// Vercel, replace with a distributed store — the call shape stays the same.
type Entry = { count: number; resetAt: number };

const store = globalThis as unknown as { __authRateLimit?: Map<string, Entry> };

function getStore(): Map<string, Entry> {
  if (!store.__authRateLimit) store.__authRateLimit = new Map<string, Entry>();
  return store.__authRateLimit;
}

if (typeof globalThis !== "undefined" && !(globalThis as unknown as { __authRateCleanup?: boolean }).__authRateCleanup) {
  (globalThis as unknown as { __authRateCleanup: boolean }).__authRateCleanup = true;
  const t = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of Array.from(getStore())) if (now > v.resetAt) getStore().delete(k);
  }, 60 * 60 * 1000);
  if (typeof (t as unknown as { unref?: () => void }).unref === "function") (t as unknown as { unref: () => void }).unref();
}

/** Returns true when the request is within limit (and counts it). */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const map = getStore();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
