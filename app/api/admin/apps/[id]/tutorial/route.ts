import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

const tutorialSectionSchema = z.object({ heading: z.string().max(160).optional(), bodyMarkdown: z.string().max(10000).optional() });

const tutorialSchema = z.object({ videoUrl: z.string().url().max(2000).optional(), videoType: z.enum(["youtube", "vimeo", "custom"]).optional(), title: z.string().min(1).max(160).optional(), description: z.string().max(2000).optional(), isActive: z.boolean(), sections: z.array(tutorialSectionSchema).max(50).optional(), contentUpdatedAt: z.coerce.date().optional() });

// Only allowlisted admins can publish or replace tutorial content.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = tutorialSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tutorial", details: parsed.error.flatten() }, { status: 400 });
  await connectToDatabase();
  // Merge with existing tutorial so old video fields are never wiped by a sections-only update (and vice versa).
  const existing = await App.findOne({ $or: [{ _id: params.id }, { slug: params.id }] }).select("tutorial").lean() as { tutorial?: Record<string, unknown> } | null;
  if (!existing) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const merged = { ...(existing.tutorial ?? {}), ...Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) };
  const hasVideo = Boolean((merged as { videoUrl?: string }).videoUrl);
  const sections = (merged as { sections?: unknown[] }).sections;
  const hasSections = Array.isArray(sections) && sections.length > 0;
  if (parsed.data.isActive && !hasVideo && !hasSections) return NextResponse.json({ error: "Provide videoUrl or sections before publishing" }, { status: 400 });
  const app = await App.findOneAndUpdate({ $or: [{ _id: params.id }, { slug: params.id }] }, { tutorial: { ...merged, contentUpdatedAt: new Date() } }, { new: true }).select("name slug tutorial").lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}
