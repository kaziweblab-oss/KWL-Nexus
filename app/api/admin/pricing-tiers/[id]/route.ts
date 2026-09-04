import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PricingTier from "@/models/PricingTier";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  price: z.string().trim().min(1).optional(),
  cadence: z.string().trim().optional(),
  description: z.string().trim().optional(),
  features: z.array(z.string().trim().min(1)).optional(),
  cta: z.string().trim().optional(),
  href: z.string().trim().optional(),
  isPopular: z.boolean().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const tier = await PricingTier.findByIdAndUpdate(params.id, { $set: parsed.data }, { new: true }).lean();
  if (!tier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: tier });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const tier = await PricingTier.findByIdAndDelete(params.id).lean();
  if (!tier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: tier });
}
