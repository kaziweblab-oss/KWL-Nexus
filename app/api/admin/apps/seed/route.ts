/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import Plan from "@/models/Plan";
import { kwlVideoDownloaderSeed, KWL_VIDEO_DOWNLOADER_SLUG } from "@/lib/seeds/kwl-video-downloader";

export const dynamic = "force-dynamic";

const seedSchema = z.object({ key: z.literal(KWL_VIDEO_DOWNLOADER_SLUG), publish: z.boolean().optional() });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

// Preview the seed definition without writing (for admin review).
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json({ data: kwlVideoDownloaderSeed });
}

// Idempotent product setup: creates the app + plans + tutorial only when missing.
// Never overwrites admin edits — re-running only fills gaps. Publish stays manual
// unless { publish: true } is passed explicitly.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = seedSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: `key must be "${KWL_VIDEO_DOWNLOADER_SLUG}"` }, { status: 400 });
  const seed = kwlVideoDownloaderSeed;

  const app = await App.findOneAndUpdate(
    { slug: seed.app.slug },
    { $setOnInsert: { ...seed.app, downloadCount: 0 } },
    { upsert: true, new: true },
  );
  if (parsed.data.publish && !app.isPublished) {
    app.isPublished = true;
    await app.save();
  }

  const plans: Array<{ slug: string; status: string }> = [];
  for (const p of seed.plans) {
    const existing = await Plan.findOne({ slug: p.slug }).select("_id").lean();
    if (existing) {
      plans.push({ slug: p.slug, status: "kept" });
      continue;
    }
    await Plan.create({ ...p, appId: seed.app.slug, appSlug: seed.app.slug, isActive: true });
    plans.push({ slug: p.slug, status: "created" });
  }

  // Seed tutorial only when the app has none yet — admin content always wins.
  let tutorial: string = "kept";
  const current = await App.findById(app._id).select("tutorial").lean() as { tutorial?: { sections?: unknown[] } } | null;
  if (!current?.tutorial?.sections?.length) {
    await App.findByIdAndUpdate(app._id, { $set: { tutorial: { ...seed.tutorial, contentUpdatedAt: new Date() } } });
    tutorial = "created";
  }

  return NextResponse.json({
    data: {
      app: { id: String(app._id), slug: seed.app.slug, isPublished: app.isPublished },
      plans,
      tutorial,
      note: "Hand the app id + slug to the desktop team with a scoped API key (Settings → API keys).",
    },
  });
}
