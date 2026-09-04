import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

const tutorialSchema = z.object({ videoUrl: z.string().url().max(2000), videoType: z.enum(["youtube", "vimeo", "custom"]), title: z.string().min(1).max(160), description: z.string().max(2000), isActive: z.boolean() });

// Only allowlisted admins can publish or replace tutorial content.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = tutorialSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tutorial", details: parsed.error.flatten() }, { status: 400 });
  await connectToDatabase();
  const app = await App.findOneAndUpdate({ $or: [{ _id: params.id }, { slug: params.id }] }, { tutorial: parsed.data }, { new: true }).select("name slug tutorial").lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}
