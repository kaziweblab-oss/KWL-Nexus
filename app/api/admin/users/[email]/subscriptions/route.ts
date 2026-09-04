import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

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

export async function GET(_: Request, { params }: { params: { email: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const email = decodeURIComponent(params.email).toLowerCase();
    const user = await User.findOne({ email }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const subs = await Subscription.find({ userId: user._id }).populate("planId").sort({ createdAt: -1 }).lean() as Array<Record<string, unknown> & { planId?: unknown }>;
    // enrich with plan info and app
    const enriched = await Promise.all(
      subs.map(async (s) => {
        const plan = s.planId as Record<string, unknown> | null | undefined;
        // if not populated, fetch
        if (plan && typeof plan === "object" && "name" in plan) {
          return { ...s, plan };
        }
        if (s.planId) {
          try {
            const p = await Plan.findById(s.planId as string).lean();
            return { ...s, plan: p };
          } catch {}
        }
        return { ...s, plan: null };
      })
    );
    return NextResponse.json({ data: enriched, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { email: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const email = decodeURIComponent(params.email).toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const body = await request.json() as { appId?: string; planId?: string; planSlug?: string; status?: string };
    let plan: { _id: unknown; interval?: string } | null = null;
    if (body.planId) {
      try {
        plan = await Plan.findById(body.planId).lean() as { _id: unknown; interval?: string } | null;
      } catch {}
    }
    if (!plan && body.planSlug) {
      plan = await Plan.findOne({ slug: body.planSlug }).lean() as { _id: unknown; interval?: string } | null;
    }
    if (!plan && body.appId) {
      plan = await Plan.findOne({ $or: [{ appId: body.appId }, { appSlug: body.appId }], isActive: true }).lean() as { _id: unknown; interval?: string } | null;
      if (!plan) {
        return NextResponse.json({ error: "No active plan found for app" }, { status: 404 });
      }
    }
    if (!plan) return NextResponse.json({ error: "planId / planSlug / appId required" }, { status: 400 });
    const status = body.status === "cancelled" || body.status === "expired" ? body.status : "active";
    const now = new Date();
    const endDate = plan.interval === "month" ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : plan.interval === "year" ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
    const sub = await Subscription.create({
      userId: user._id,
      planId: plan._id,
      status,
      startDate: now,
      endDate,
      startedAt: now,
      endsAt: endDate,
    });
    return NextResponse.json({ data: sub }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
