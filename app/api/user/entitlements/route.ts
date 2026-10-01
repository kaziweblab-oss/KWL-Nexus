/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Entitlement from "@/models/Entitlement";
import Plan from "@/models/Plan";
import App from "@/models/App";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// What the user owns right now: live entitlements with product info and a
// download entry point. Expired/revoked rows are excluded.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Login required" }, { status: 401 });
  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean() as { _id: unknown } | null;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const now = new Date();
  const ents = (await Entitlement.find({
    userId: user._id,
    status: "active",
    $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .lean()) as any[];
  const planIds = Array.from(new Set(ents.map((e) => String(e.planId ?? "")).filter(Boolean)));
  const slugs = Array.from(new Set(ents.map((e) => String(e.appSlug ?? "").toLowerCase()).filter(Boolean)));
  const [plans, apps] = await Promise.all([
    planIds.length ? (Plan.find({ _id: { $in: planIds } }).select("name").lean() as Promise<any[]>) : [],
    slugs.length ? (App.find({ slug: { $in: slugs } }).select("name slug").lean() as Promise<any[]>) : [],
  ]);
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const appBySlug = new Map(apps.map((a) => [String(a.slug).toLowerCase(), a]));
  const data = ents.map((e) => {
    const slug = String(e.appSlug).toLowerCase();
    const app = appBySlug.get(slug);
    const plan = e.planId ? planById.get(String(e.planId)) : null;
    return {
      _id: String(e._id),
      appSlug: slug,
      appName: app?.name ?? e.appSlug,
      planName: plan?.name ?? null,
      type: e.type,
      endsAt: e.endsAt ?? null,
      lifetime: !e.endsAt,
      downloadPath: `/download/${encodeURIComponent(e.appSlug)}`,
    };
  });
  return NextResponse.json({ data });
}
