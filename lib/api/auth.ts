import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import ApiKey from "@/models/ApiKey";

const WINDOW_MS = 60 * 60 * 1000;
const requestWindows = new Map<string, { startedAt: number; count: number }>();

// API keys are never stored in plaintext; only a SHA-256 digest is persisted.
export function hashApiKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createApiKey() {
  return `kn_live_${crypto.randomBytes(24).toString("hex")}`;
}

// Reversible secret storage for admin reveal-on-demand (AES-256-GCM, key from NEXTAUTH_SECRET).
// Hash stays the source of truth for auth; this only powers the dashboard "Show key" button.
function getSecretKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for API key encryption");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKeySecret(value: string) {
  const key = getSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

export function decryptApiKeySecret(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getSecretKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

// Record which app a key last called (non-blocking, never throws). Powers key "used by" cards.
export function touchKeyApp(apiKeyId: string | undefined, slug: string | undefined) {
  if (!apiKeyId || !slug) return;
  try {
    void ApiKey.updateOne({ _id: apiKeyId }, { lastAppSlug: slug.toLowerCase(), lastAppAt: new Date() }).exec().catch(() => {});
  } catch {}
}
// Returns null when allowed, otherwise an error response descriptor.
export async function assertKeyScope(
  auth: { userId?: string; apiKeyId?: string; appScope?: string | null },
  appRef: { slug?: string; id?: string },
): Promise<{ error: string; status: 403 } | null> {
  const scope = auth.appScope;
  if (!auth.apiKeyId || !scope) return null; // sessions + unscoped keys: all apps
  const want = (appRef.slug ?? "").toLowerCase();
  if (want && want === scope.toLowerCase()) return null;
  // Also accept ObjectId: resolve the scoped slug to compare ids.
  if (appRef.id) {
    try {
      const { connectToDatabase } = await import("@/lib/db/connect");
      await connectToDatabase();
      const App = (await import("@/models/App")).default;
      const scoped = await App.findOne({ slug: scope }).select("_id").lean() as unknown as { _id?: { toString(): string } } | null;
      if (scoped?._id && String(scoped._id) === appRef.id) return null;
    } catch {}
  }
  return { error: "This API key is scoped to another app", status: 403 };
}

export const API_KEY_SCOPES = ["app:read", "release:read", "entitlement:read", "update:read"] as const;

// Granular scope check. Sessions always pass (user context); legacy keys without a
// scopes array keep full access so old integrations never break.
export function hasKeyScope(auth: { apiKeyId?: string; scopes?: string[] | null }, scope: string): boolean {
  if (!auth.apiKeyId) return true;
  const list = auth.scopes;
  if (!list || !list.length) return true;
  return list.includes(scope);
}

export async function authenticateApiRequest(request: Request) {
  const raw = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (raw) {
    await connectToDatabase();
    const apiKey = await ApiKey.findOne({ keyHash: hashApiKey(raw), isRevoked: false, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
    if (!apiKey) return { error: "Invalid or revoked API key", status: 401 as const };
    const now = Date.now();
    const window = requestWindows.get(apiKey.id);
    const nextWindow = !window || now - window.startedAt >= WINDOW_MS ? { startedAt: now, count: 1 } : { ...window, count: window.count + 1 };
    requestWindows.set(apiKey.id, nextWindow);
    if (nextWindow.count > (apiKey.rateLimitPerHour ?? 1000)) return { error: "Rate limit exceeded", status: 429 as const };
    await ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() });
    return {
      userId: apiKey.userId.toString(),
      apiKeyId: apiKey.id,
      appScope: (apiKey.appId as string | null) ?? null,
      scopes: (Array.isArray(apiKey.scopes) && apiKey.scopes.length ? apiKey.scopes : null) as string[] | null,
    };
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    await connectToDatabase();
    const User = (await import("@/models/User")).default;
    const user = await User.findOneAndUpdate({ email: session.user.email }, { $setOnInsert: { email: session.user.email, name: session.user.name, image: session.user.image } }, { upsert: true, new: true });
    if (user) return { userId: user._id.toString() };
  }
  return { error: "Authentication required", status: 401 as const };
}
