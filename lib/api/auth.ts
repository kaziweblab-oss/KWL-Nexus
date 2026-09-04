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
    return { userId: apiKey.userId.toString(), apiKeyId: apiKey.id };
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
