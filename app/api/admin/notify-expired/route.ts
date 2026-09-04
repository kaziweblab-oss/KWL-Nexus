import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  try {
    await connectToDatabase();
  } catch {
    return session;
  }
  return session;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const { appId, message } = await request.json() as { appId?: string; message?: string };
    if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });

    let planIds: unknown[] | null = null;
    if (appId && appId !== "all") {
      const plans = await Plan.find({ $or: [{ appId }, { appSlug: appId }], isActive: true }).select("_id").lean<{ _id: unknown }[]>();
      planIds = plans.map((p) => p._id);
      if (!planIds.length) return NextResponse.json({ sent: 0, message: "No plans for app" });
    }

    const filter: Record<string, unknown> = { status: { $in: ["expired", "cancelled", "past_due"] } };
    if (planIds) (filter as Record<string, unknown> & { planId?: unknown }).planId = { $in: planIds };

    const expired = await Subscription.find(filter).select("userId").lean();
    // TODO: integrate with email/push service — for now just count
    // e.g., await sendEmailToUsers(expired.map(s=>s.userId), message)

    return NextResponse.json({ sent: expired.length, appId: appId ?? "all", preview: message.slice(0, 120) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
