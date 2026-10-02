import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";
import Notification from "@/models/Notification";
import Plan from "@/models/Plan";
import User from "@/models/User";
import { apps } from "@/lib/data/apps";
import { logEvent } from "@/lib/observability/log";
import { isCronAuthorized } from "@/lib/cron/auth";

// Run this endpoint from a daily scheduler to expire subscriptions consistently and notify 5 days before.
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectToDatabase();
  const now = new Date();
  // Expire in two steps so linked entitlements die with their subscription.
  // Bounded and idempotent: re-running only touches rows still marked active.
  const expiring = await Subscription.find({ status: "active", $or: [{ endDate: { $lte: now } }, { endsAt: { $lte: now } }] }).select("_id").limit(500).lean() as Array<{ _id: unknown }>;
  const ids = expiring.map((s) => s._id);
  let expired = 0;
  if (ids.length) {
    const result = await Subscription.updateMany({ _id: { $in: ids }, status: "active" }, { $set: { status: "expired" } });
    expired = result.modifiedCount;
    try {
      const Entitlement = (await import("@/models/Entitlement")).default;
      await Entitlement.updateMany({ subscriptionId: { $in: ids }, status: "active" }, { $set: { status: "expired" } });
    } catch {}
  }

  // 5 days before expiration — notify with app name + renew
  const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const upcoming = await Subscription.find({ status: "active", $or: [{ endsAt: { $gte: now, $lte: fiveDaysFromNow } }, { endDate: { $gte: now, $lte: fiveDaysFromNow } }] }).lean();
  let notified = 0;
  for (const sub of upcoming) {
    try {
      const endsAt = (sub as { endsAt?: Date; endDate?: Date }).endsAt ?? (sub as { endDate?: Date }).endDate;
      if (!endsAt) continue;
      const daysLeft = Math.ceil((new Date(endsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // avoid duplicate notify within 4 days
      const existing = await Notification.findOne({
        userId: sub.userId,
        type: "subscription",
        appId: String((sub as { planId?: unknown }).planId ?? ""),
        createdAt: { $gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
        title: { $regex: "expir", $options: "i" },
      }).lean();
      if (existing) continue;
      const plan = sub.planId ? await Plan.findById(sub.planId).lean() as { name?: string; appId?: string; appSlug?: string } | null : null;
      const appId = plan?.appId ?? plan?.appSlug ?? String((sub as { planId?: unknown }).planId ?? "app");
      const appName = apps.find((a) => a.id === appId)?.name ?? appId;
      const planName = plan?.name ? ` ${plan.name}` : "";
      const user = await User.findById(sub.userId).lean() as { email?: string } | null;
      if (!user?.email) continue;
      const expDate = new Date(endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      await Notification.create({
        userId: sub.userId,
        email: user.email!.toLowerCase(),
        title: `${appName} expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        message: `Your ${appName}${planName} subscription expires on ${expDate} (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left). Renew now to keep premium features.`,
        type: "subscription",
        appId,
        appName,
        read: false,
      });
      notified++;
    } catch {}
  }

  logEvent("cron:subscriptions", "expiry run finished", { expired, notified5d: notified });
  return NextResponse.json({ data: { expired, notified5d: notified, checkedAt: now.toISOString() } });
}

// Vercel Cron invokes scheduled routes with GET; keep POST available for manual runs.
export const GET = POST;
