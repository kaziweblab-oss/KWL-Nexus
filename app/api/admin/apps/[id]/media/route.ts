import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

export const dynamic = "force-dynamic";

const schema = z.object({
  screenshots: z.array(z.string().trim().url().or(z.string().trim().min(1))).optional(),
  previewImageUrl: z.string().trim().optional(),
  previewImages: z.array(z.string().trim()).optional(),
  previewVideoUrl: z.string().trim().optional(),
  screenshotVideos: z.array(z.string().trim()).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const app = await App.findOne({ slug: params.id.toLowerCase() }).lean() as unknown as { screenshots?: string[]; previewImageUrl?: string; previewImages?: string[]; previewVideoUrl?: string; screenshotVideos?: string[] } | null;
  if (!app) return NextResponse.json({ data: { screenshots: [], previewImageUrl: "", previewImages: [], previewVideoUrl: "", screenshotVideos: [] } });
  return NextResponse.json({ data: { screenshots: app.screenshots ?? [], previewImageUrl: app.previewImageUrl ?? "", previewImages: app.previewImages ?? [], previewVideoUrl: app.previewVideoUrl ?? "", screenshotVideos: app.screenshotVideos ?? [] } });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (parsed.data.screenshots !== undefined) update.screenshots = parsed.data.screenshots;
  if (parsed.data.previewImageUrl !== undefined) update.previewImageUrl = parsed.data.previewImageUrl;
  if (parsed.data.previewImages !== undefined) update.previewImages = parsed.data.previewImages;
  if (parsed.data.previewVideoUrl !== undefined) update.previewVideoUrl = parsed.data.previewVideoUrl;
  if (parsed.data.screenshotVideos !== undefined) update.screenshotVideos = parsed.data.screenshotVideos;
  const app = await App.findOneAndUpdate({ slug: params.id.toLowerCase() }, { $set: update }, { new: true, upsert: false }).lean();
  if (!app) return NextResponse.json({ error: "App not found. Create app first via GitHub import." }, { status: 404 });
  return NextResponse.json({ data: app });
}
