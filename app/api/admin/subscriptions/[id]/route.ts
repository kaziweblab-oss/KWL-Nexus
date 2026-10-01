import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";
import Entitlement from "@/models/Entitlement";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  try {
    await connectToDatabase();
  } catch {
    return session;
  }
  return session;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json() as { status?: string; action?: string };
    const raw = (body.status ?? body.action ?? "").toLowerCase();
    let status: string | null = null;
    if (["active", "activate", "resume"].includes(raw)) status = "active";
    else if (["cancelled", "cancel", "stop", "block"].includes(raw)) status = "cancelled";
    else if (["expired"].includes(raw)) status = "expired";
    else if (["past_due"].includes(raw)) status = "past_due";
    if (!status) return NextResponse.json({ error: "status must be active/cancelled/expired" }, { status: 400 });
    const sub = await Subscription.findById(params.id);
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    sub.status = status as typeof sub.status;
    if (status === "cancelled" || status === "expired") {
      sub.endsAt = new Date();
      sub.endDate = new Date();
    } else if (status === "active") {
      // extend 30 days if was expired
      const now = new Date();
      sub.startDate = sub.startDate ?? now;
      sub.startedAt = sub.startedAt ?? now;
      if (!sub.endsAt || sub.endsAt < now) {
        const plan = sub.planId ? await (await import("@/models/Plan")).default.findById(sub.planId).lean() as { interval?: string } | null : null;
        const interval = plan?.interval;
        if (interval === "month") sub.endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        else if (interval === "year") sub.endsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        else sub.endsAt = null;
        sub.endDate = sub.endsAt;
      }
    }
    await sub.save();
    // Keep download access in sync: cancelled/expired kills the grant, resume restores it.
    try {
      if (status === "cancelled" || status === "expired") {
        await Entitlement.updateMany({ subscriptionId: sub._id, status: "active" }, { $set: { status: "revoked" } });
      } else if (status === "active") {
        await Entitlement.updateMany({ subscriptionId: sub._id, status: "revoked" }, { $set: { status: "active", endsAt: sub.endsAt ?? null } });
      }
    } catch {}
    return NextResponse.json({ data: sub });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const del = await Subscription.findByIdAndDelete(params.id).lean();
    if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      await Entitlement.updateMany({ subscriptionId: (del as { _id: unknown })._id, status: "active" }, { $set: { status: "revoked" } });
    } catch {}
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
