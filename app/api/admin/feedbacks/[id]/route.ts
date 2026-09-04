import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Feedback from "@/models/Feedback";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

// PUT /api/admin/feedbacks/[id] — রিপ্লাই ও রিজল্ভ সিস্টেম
// body: { status?: "pending"|"replied"|"resolved"|"ignored", adminReply?: string }
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: { status?: string; adminReply?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["pending", "replied", "resolved", "ignored"] as const;
  if (body.status && !(allowed as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (body.status) {
    update.status = body.status;
    if (body.status === "resolved") update.resolvedAt = new Date();
    if (body.status === "replied" && !body.adminReply) {
      // Replied requires reply text — allow but warn
    }
  }
  if (typeof body.adminReply === "string") {
    update.adminReply = body.adminReply.trim().slice(0, 5000);
    // If adminReply provided without explicit status, auto-set to replied
    if (!body.status) update.status = "replied";
  }

  const feedback = await Feedback.findByIdAndUpdate(id, update, { new: true })
    .populate("appId", "name slug")
    .populate("userId", "name email")
    .lean();

  if (!feedback) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });

  return NextResponse.json({ data: feedback });
}

// GET single feedback for admin
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  await connectToDatabase();
  const feedback = await Feedback.findById(params.id).populate("appId", "name slug").populate("userId", "name email").lean();
  if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: feedback });
}
