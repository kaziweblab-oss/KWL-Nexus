import crypto from "crypto";

const GITHUB_API = "https://api.github.com";

// Keep GitHub request headers in one place so API routes stay small and consistent.
export async function githubFetch<T>(path: string, accessToken: string) {
  const response = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}`, "X-GitHub-Api-Version": "2022-11-28" }, next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json() as Promise<T>;
}

// ── PAT encryption (stored encrypted in SystemConfig) ──
// Requires NEXTAUTH_SECRET to be set; no hardcoded fallback (audit CRITICAL fix).
function getKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for GitHub PAT encryption. Set it in .env.local / Vercel env.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}
export function encryptToken(token: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}
export function decryptToken(enc: string): string {
  try {
    const [ivHex, tagHex, dataHex] = enc.split(":");
    if (!ivHex || !tagHex || !dataHex) return enc;
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return enc;
  }
}

// Resolve effective GitHub token: SystemConfig (DB, encrypted) > Integration PAT > GITHUB_TOKEN env > OAuth token
export async function getEffectiveGithubToken(oauthToken?: string | null): Promise<string | null> {
  // 1) DB stored PAT (encrypted)
  try {
    const { connectToDatabase } = await import("@/lib/db/connect");
    await connectToDatabase();
    const SystemConfig = (await import("@/models/SystemConfig")).default;
    const cfg = await SystemConfig.findOne().select("+githubToken").lean() as unknown as { githubToken?: string } | null;
    if (cfg?.githubToken) {
      const dec = decryptToken(cfg.githubToken);
      if (dec && dec.startsWith("ghp_")) return dec;
      if (dec) return dec;
    }
  } catch {}
  // 1b) Project integration PAT (same token the repo list uses — keeps list + detail in sync)
  try {
    const integrationToken = await getConfiguredGithubIntegrationToken();
    if (integrationToken) return integrationToken;
  } catch {}
  // 2) Env fallback
  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) return envToken;
  // 3) OAuth access token (user's GitHub login)
  if (oauthToken) return oauthToken;
  return null;
}

export async function getConfiguredGithubIntegrationToken(): Promise<string | null> {
  try {
    const { connectToDatabase } = await import("@/lib/db/connect");
    await connectToDatabase();
    const Integration = (await import("@/models/Integration")).default;
    const item = await Integration.findOne({ provider: "github", enabled: true }).select("credentials").lean() as { credentials?: Map<string, string> | Record<string, string> } | null;
    const credentials = item?.credentials instanceof Map ? Object.fromEntries(item.credentials) : item?.credentials;
    const token = credentials?.token;
    return token ? decryptToken(token) : null;
  } catch {
    return null;
  }
}

export function detectPlatform(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".apk")) return "Android";
  if (lower.endsWith(".exe")) return "Windows";
  if (lower.endsWith(".deb")) return "Linux";
  return "Other";
}
