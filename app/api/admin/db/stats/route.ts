import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase, getConnection } from "@/lib/db/connect";
import { getDatabaseStats } from "@/lib/db/health";
import { decryptToken } from "@/lib/github/client";
import Integration from "@/models/Integration";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  try {
    await connectToDatabase();
    const item = id ? await Integration.findOne({ _id: id, provider: "mongodb", enabled: true }).select("name credentials").lean() : null;
    if (!item) return NextResponse.json({ error: "Enabled MongoDB integration not found" }, { status: 404 });
    const stored = Object.fromEntries(item.credentials ?? new Map());
    if (!stored.uri) return NextResponse.json({ error: "Database configuration is incomplete" }, { status: 400 });
    const stats = await getDatabaseStats(await getConnection(decryptToken(stored.uri)));
    return NextResponse.json({ data: { name: item.name, ...stats, timestamp: new Date().toISOString() } });
  } catch {
    return NextResponse.json({ error: "Database statistics unavailable" }, { status: 503 });
  }
}