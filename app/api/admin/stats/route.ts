import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";
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

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const url = new URL(request.url);
    const appId = url.searchParams.get("appId");
    const planFilter: Record<string, unknown> = { isActive: true };
    const paymentFilter: Record<string, unknown> = { status: "pending" };
    const subscriptionFilter: Record<string, unknown> = { status: "active" };
    let planIds: string[] | null = null;
    const expiredFilter: Record<string, unknown> = { status: { $in: ["expired", "cancelled", "past_due"] } };
    if (appId && appId !== "all") {
      planFilter.$or = [{ appId }, { appSlug: appId }];
      const plans = await Plan.find(planFilter).select("_id").lean<{ _id: unknown }[]>();
      planIds = plans.map((p) => p._id as string);
      // for payments/subscriptions, filter by those planIds; if no plans, counts are 0
      if (planIds.length) {
        (paymentFilter as Record<string, unknown> & { planId?: unknown }).planId = { $in: planIds };
        (subscriptionFilter as Record<string, unknown> & { planId?: unknown }).planId = { $in: planIds };
        (expiredFilter as Record<string, unknown> & { planId?: unknown }).planId = { $in: planIds };
      } else {
        // no plans for this app -> pending/subscriptions are 0, but activePlans already 0
        return NextResponse.json({ data: { pendingRequests: 0, activeSubscriptions: 0, activePlans: 0, expiredSubscriptions: 0 } });
      }
    }
    const [pendingRequests, activeSubscriptions, activePlans, expiredSubscriptions] = await Promise.all([
      Payment.countDocuments(paymentFilter),
      Subscription.countDocuments(subscriptionFilter),
      Plan.countDocuments(planFilter),
      Subscription.countDocuments(expiredFilter),
    ]);
    return NextResponse.json({ data: { pendingRequests, activeSubscriptions, activePlans, expiredSubscriptions } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
