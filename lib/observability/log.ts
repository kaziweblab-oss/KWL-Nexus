// Lightweight structured logging for production. One JSON line per event —
// scrapable by Vercel log drains. NEVER pass secrets, tokens, codes or hashes
// in fields (ids, slugs, tags, statuses and counts only).
export function logEvent(scope: string, message: string, fields: Record<string, string | number | boolean | null | undefined> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), scope, message, ...fields });
  if (scope.endsWith(":error")) console.error(line);
  else console.log(line);
}
