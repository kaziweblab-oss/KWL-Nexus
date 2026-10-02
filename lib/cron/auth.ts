// Vercel Cron cannot send custom Authorization headers, so scheduler invocations
// would 401 against a Bearer-only gate and silently never run. Accept the header
// for manual runs AND a ?secret= query fallback for the scheduler. The query form
// can land in access logs — prefer the header manually, rotate if ever leaked.
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get("secret") === secret;
  } catch {
    return false;
  }
}
