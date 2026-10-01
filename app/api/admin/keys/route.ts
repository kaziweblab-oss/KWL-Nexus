import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import ApiKey from "@/models/ApiKey";
import { createApiKey, hashApiKey, encryptApiKeySecret } from "@/lib/api/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  const User = (await import("@/models/User")).default;
  return User.findOne({ email: session.user.email });
}

// Generate a key once and return the plaintext only in this response.
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { name?: string; appId?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  // Optional one-app scope (slug). Empty = all apps (admin key).
  const appScope = body.appId?.trim() || null;
  if (appScope) {
    const App = (await import("@/models/App")).default;
    const exists = await App.findOne({ slug: appScope }).select("_id").lean();
    if (!exists) return NextResponse.json({ error: "App not found for scope" }, { status: 400 });
  }
  const plainKey = createApiKey();
  const record = await ApiKey.create({ userId: user._id, name, keyHash: hashApiKey(plainKey), keyEnc: encryptApiKeySecret(plainKey), appId: appScope, rateLimitPerHour: 1000 });
  return NextResponse.json({ data: { id: record.id, name: record.name, appId: appScope, key: plainKey, rateLimitPerHour: record.rateLimitPerHour } }, { status: 201 });
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const keys = await ApiKey.find({ userId: user._id }).select("name appId lastAppSlug lastAppAt lastUsedAt expiresAt isRevoked rateLimitPerHour createdAt").sort({ createdAt: -1 }).lean() as unknown as Record<string, unknown>[];
  // Attach used-by app details (name, logo, status, version) for key cards.
  try {
    const slugs = Array.from(new Set(keys.map((k) => k.lastAppSlug).filter(Boolean))) as string[];
    if (slugs.length) {
      const App = (await import("@/models/App")).default;
      const apps = await App.find({ slug: { $in: slugs } }).select("slug name iconUrl isPublished latestVersion").lean() as unknown as Record<string, unknown>[];
      const bySlug = new Map(apps.map((a) => [a.slug, a]));
      for (const k of keys) {
        if (k.lastAppSlug && bySlug.has(k.lastAppSlug)) k.lastApp = bySlug.get(k.lastAppSlug);
      }
    }
  } catch {}
  return NextResponse.json({ data: keys });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Key id is required" }, { status: 400 });
  // hard=true permanently removes the row; default only revokes (soft, keeps audit trail).
  if (url.searchParams.get("hard") === "true" || url.searchParams.get("mode") === "hard") {
    await ApiKey.deleteOne({ _id: id, userId: user._id });
    return NextResponse.json({ data: { deleted: true } });
  }
  await ApiKey.updateOne({ _id: id, userId: user._id }, { isRevoked: true });
  return NextResponse.json({ data: { revoked: true } });
}
