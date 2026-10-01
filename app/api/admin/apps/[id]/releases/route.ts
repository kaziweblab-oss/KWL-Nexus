import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import AppVersion from "@/models/AppVersion";
import Release from "@/models/Release";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

async function loadApp(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await App.findById(id).lean() as { _id: unknown; githubOwner?: string; githubRepo?: string } | null;
    if (byId) return byId;
  }
  return App.findOne({ slug: id }).lean() as Promise<{ _id: unknown; githubOwner?: string; githubRepo?: string } | null>;
}

// Full version history for one app: GitHub-synced Releases (linked by appId or by
// repo) plus manual AppVersion snapshots. Never deletes — history is append-only.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const app = await loadApp(params.id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));
  const or: Record<string, unknown>[] = [{ appId: app._id }];
  if (app.githubOwner && app.githubRepo) or.push({ githubOwner: app.githubOwner, githubRepo: app.githubRepo });
  const [releases, total] = await Promise.all([
    Release.find({ $or: or }).sort({ publishedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Release.countDocuments({ $or: or }),
  ]);
  return NextResponse.json({ data: { releases, page, limit, total } });
}

const promoteSchema = z.object({ tagName: z.string().min(1).max(100) });

// Promote a synced release to latest: moves the App.latestVersion pointer and
// rotates the AppVersion current flag. Old records are kept — rollback safe.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const email = session.user?.email ?? "admin";
  const parsed = promoteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "tagName is required" }, { status: 400 });
  const app = await loadApp(params.id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const or: Record<string, unknown>[] = [{ appId: app._id, tagName: parsed.data.tagName }];
  if (app.githubOwner && app.githubRepo) {
    or.push({ githubOwner: app.githubOwner, githubRepo: app.githubRepo, tagName: parsed.data.tagName });
  }
  const release = await Release.findOne({ $or: or }).lean() as { tagName?: string } | null;
  if (!release) return NextResponse.json({ error: "Release not found for this app" }, { status: 404 });
  await App.findByIdAndUpdate(app._id, { $set: { latestVersion: parsed.data.tagName } });
  try {
    await AppVersion.updateMany({ appId: String(app._id), isCurrent: true }, { $set: { isCurrent: false } });
    await AppVersion.create({ appId: String(app._id), version: parsed.data.tagName, tag: parsed.data.tagName, notes: `Promoted from GitHub release ${parsed.data.tagName}`, changedBy: email, isCurrent: true });
  } catch {}
  return NextResponse.json({ data: { latestVersion: parsed.data.tagName } });
}
