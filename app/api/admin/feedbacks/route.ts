import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Feedback from "@/models/Feedback";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return false;
  try {
    await connectToDatabase();
  } catch {
    // DB offline — still consider admin for auth gate, but API will handle DB error gracefully
    return true;
  }
  return true;
}

// Admin moderation reads all feedback and updates its reply/status lifecycle.
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const feedback = await Feedback.find().populate("appId", "name slug").populate("userId", "name email").sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: feedback });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable", data: [] }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json() as { id?: string; status?: "pending" | "resolved" | "ignored" | "replied"; adminReply?: string };
    if (!body.id || !body.status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    const feedback = await Feedback.findByIdAndUpdate(body.id, { status: body.status, adminReply: body.adminReply, resolvedAt: body.status === "resolved" ? new Date() : undefined }, { new: true }).lean();
    if (!feedback) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    return NextResponse.json({ data: feedback });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}
