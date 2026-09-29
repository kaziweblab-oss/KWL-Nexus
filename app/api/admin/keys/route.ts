import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import ApiKey from "@/models/ApiKey";
import { createApiKey, hashApiKey } from "@/lib/api/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  await connectToDatabase();
  const User = (await import("@/models/User")).default;
  return User.findOne({ email: session.user.email });
}

// Generate a key once and return the plaintext only in this response.
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  const plainKey = createApiKey();
  const record = await ApiKey.create({ userId: user._id, name, keyHash: hashApiKey(plainKey), rateLimitPerHour: 1000 });
  return NextResponse.json({ data: { id: record.id, name: record.name, key: plainKey, rateLimitPerHour: record.rateLimitPerHour } }, { status: 201 });
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const keys = await ApiKey.find({ userId: user._id }).select("name lastUsedAt expiresAt isRevoked rateLimitPerHour createdAt").sort({ createdAt: -1 }).lean();
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
