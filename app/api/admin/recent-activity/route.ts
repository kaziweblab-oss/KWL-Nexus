import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import Subscription from "@/models/Subscription";
import Feedback from "@/models/Feedback";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

function formatAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const [apps, subs, feedbacks, payments] = await Promise.all([
      App.find({}).sort({ updatedAt: -1 }).limit(3).select("name latestVersion updatedAt isPublished").lean(),
      Subscription.find({}).sort({ createdAt: -1 }).limit(3).populate("planId", "name").lean(),
      Feedback.find({}).sort({ createdAt: -1 }).limit(3).populate("appId", "name").lean(),
      Payment.find({ status: "succeeded" }).sort({ createdAt: -1 }).limit(2).lean(),
    ]);

    const items: Array<{ id: string; text: string; time: string; rawDate: Date }> = [];

    for (const a of apps as Array<{ _id: unknown; name: string; latestVersion?: string; updatedAt?: Date }>) {
      items.push({ id: `app-${String(a._id)}`, text: `${a.name} ${a.latestVersion ? `v${a.latestVersion}` : ""} was published`.trim(), time: formatAgo(a.updatedAt ?? new Date()), rawDate: a.updatedAt ?? new Date() });
    }
    for (const s of subs as Array<{ _id: unknown; createdAt?: Date; planId?: { name?: string } }>) {
      const planName = (s.planId as { name?: string } | null)?.name ?? "subscription";
      items.push({ id: `sub-${String(s._id)}`, text: `A new ${planName} subscription started`, time: formatAgo(s.createdAt ?? new Date()), rawDate: s.createdAt ?? new Date() });
    }
    for (const f of feedbacks as Array<{ _id: unknown; createdAt?: Date; appId?: { name?: string }; rating?: number }>) {
      const appName = (f.appId as { name?: string } | null)?.name ?? "An app";
      items.push({ id: `fb-${String(f._id)}`, text: `${appName} received a ${f.rating ?? 5}-star review`, time: formatAgo(f.createdAt ?? new Date()), rawDate: f.createdAt ?? new Date() });
    }
    for (const p of payments as Array<{ _id: unknown; createdAt?: Date; amount?: number }>) {
      items.push({ id: `pay-${String(p._id)}`, text: `Payment of $${p.amount ?? 0} succeeded`, time: formatAgo(p.createdAt ?? new Date()), rawDate: p.createdAt ?? new Date() });
    }

    items.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    const top = items.slice(0, 5).map(({ id, text, time }) => ({ id, text, time }));

    return NextResponse.json({ data: top });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
