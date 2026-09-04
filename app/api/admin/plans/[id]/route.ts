import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Plan from "@/models/Plan";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  price: z.number().min(0).optional(),
  interval: z.enum(["month", "year", "lifetime", "custom"]).optional(),
  durationDays: z.number().int().min(1).nullable().optional(),
  refundEnabled: z.boolean().optional(),
  refundDays: z.number().int().min(1).nullable().optional(),
  features: z.array(z.string().trim().min(1)).optional(),
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
  const plan = await Plan.findByIdAndUpdate(params.id, { $set: parsed.data }, { new: true }).lean();
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: plan });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const plan = await Plan.findByIdAndDelete(params.id).lean();
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: plan });
}
