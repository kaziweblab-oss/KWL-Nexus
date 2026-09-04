import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalApps, appsThisMonth, users, usersThisMonth, revenueAgg, revenueMonthAgg, downloadsAgg, subsThisMonth] = await Promise.all([
      App.countDocuments({}),
      App.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Payment.aggregate([{ $match: { status: "succeeded" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "succeeded", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      App.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }]),
      Subscription.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    const revenue = revenueAgg[0]?.total ?? 0;
    const revenueMonth = revenueMonthAgg[0]?.total ?? 0;
    const downloads = downloadsAgg[0]?.total ?? 0;

    // helper to format
    const fmt = (n: number) => n.toLocaleString("en-US");
    const fmtMoney = (n: number) => `$${n.toLocaleString("en-US")}`;

    // For downloads delta, use subsThisMonth as proxy if downloads is 0
    const downloadsDeltaCount = subsThisMonth;

    return NextResponse.json({
      data: {
        totalApps: { value: fmt(totalApps), raw: totalApps, delta: `+${appsThisMonth} this month` },
        users: { value: fmt(users), raw: users, delta: users > 0 && usersThisMonth > 0 ? `+${((usersThisMonth / Math.max(1, users - usersThisMonth)) * 100).toFixed(1)}% this month` : `+${usersThisMonth} this month` },
        revenue: { value: fmtMoney(revenue), raw: revenue, delta: revenueMonth > 0 ? `+${fmtMoney(revenueMonth)} this month` : revenue > 0 ? `+${((revenueMonth / Math.max(1, revenue)) * 100).toFixed(1)}% this month` : "+0 this month" },
        downloads: { value: downloads >= 1000 ? `${(downloads / 1000).toFixed(downloads >= 10000 ? 0 : 1)}K` : fmt(downloads), raw: downloads, delta: downloadsDeltaCount > 0 ? `+${downloadsDeltaCount} this month` : "+0 this month" },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
