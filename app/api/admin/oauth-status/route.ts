import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Integration from "@/models/Integration";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const data: Record<string, boolean> = {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };
  try {
    await connectToDatabase();
    const managed = await Integration.find({ provider: { $in: Object.keys(data) } }).select("provider enabled status").lean();
    for (const item of managed) data[item.provider] = Boolean(item.enabled && item.status === "connected");
  } catch { /* env status remains the safe fallback */ }
  return NextResponse.json({ data });
}
