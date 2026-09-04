import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PricingTier from "@/models/PricingTier";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1),
  price: z.string().trim().min(1),
  cadence: z.string().trim().min(1).default("/month"),
  description: z.string().trim().min(1),
  features: z.array(z.string().trim().min(1)).default([]),
  cta: z.string().trim().optional().default("Get Started"),
  href: z.string().trim().optional().default("/apps"),
  isPopular: z.boolean().optional().default(false),
  order: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const tiers = await PricingTier.find().sort({ order: 1 }).lean();
  return NextResponse.json({ data: tiers });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const tier = await PricingTier.create(parsed.data);
  return NextResponse.json({ data: tier }, { status: 201 });
}
