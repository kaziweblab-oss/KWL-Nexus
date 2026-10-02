import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

// Append-only audit trail viewer (admin). Filter by action, newest first.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));
  const action = req.nextUrl.searchParams.get("action")?.trim();
  await connectToDatabase();
  const filter: Record<string, unknown> = action ? { action } : {};
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  return NextResponse.json({ data: { logs, page, limit, total } });
}
