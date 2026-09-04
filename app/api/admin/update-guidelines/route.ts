import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import UpdateGuideline from "@/models/UpdateGuideline";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

// GET /api/admin/update-guidelines — অ্যাডমিন এডিটের জন্য
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  await connectToDatabase();
  let doc = await UpdateGuideline.findOne().sort({ updatedAt: -1 }).lean();
  if (!doc) doc = await UpdateGuideline.create({ content: "" });
  return NextResponse.json({ data: doc });
}

// PUT /api/admin/update-guidelines — “Update Guidelines” টেক্সট এডিট
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (body.content.length > 10000) {
    return NextResponse.json({ error: "Content too long (max 10000)" }, { status: 400 });
  }
  await connectToDatabase();
  let doc = await UpdateGuideline.findOne().sort({ updatedAt: -1 });
  if (!doc) doc = new UpdateGuideline({ content: body.content.trim() });
  else doc.content = body.content.trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).updatedBy = session.user?.email ?? "admin";
  await doc.save();
  return NextResponse.json({ data: doc });
}
