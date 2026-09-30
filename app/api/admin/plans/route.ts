import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Plan from "@/models/Plan";
import { syncAppPricing } from "@/lib/admin/pricing";

export const dynamic = "force-dynamic";

const schema = z.object({
  appId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().default(""),
  price: z.number().min(0),
  interval: z.enum(["month", "year", "lifetime", "custom"]),
  durationDays: z.number().int().min(1).nullable().optional(),
  refundEnabled: z.boolean().optional().default(false),
  refundDays: z.number().int().min(1).nullable().optional(),
  features: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().optional().default(true),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");
  const filter: Record<string, unknown> = {};
  if (appId) filter.$or = [{ appId }, { appSlug: appId }];
  const plans = await Plan.find(Object.keys(filter).length ? filter : {}).sort({ price: 1 }).lean();
  return NextResponse.json({ data: plans });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const slug = parsed.data.slug ?? `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const plan = await Plan.create({ ...parsed.data, slug });
  await syncAppPricing(parsed.data.appId ?? null);
  return NextResponse.json({ data: plan }, { status: 201 });
}
