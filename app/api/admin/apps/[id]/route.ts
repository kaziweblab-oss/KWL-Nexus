import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import AppVersion from "@/models/AppVersion";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

function matchById(id: string) {
  if (isValidObjectId(id)) return { _id: id };
  return { slug: id };
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z.string().min(1).max(60).optional(),
  pricing: z.enum(["free", "paid", "freemium"]).optional(),
  websiteUrl: z.string().url().max(2000).optional().or(z.literal("")),
  iconUrl: z.string().max(4000).optional().or(z.literal("")),
  latestVersion: z.string().max(40).optional().or(z.literal("")),
  downloadUrl: z
    .object({
      android: z.string().max(4000).optional().or(z.literal("")),
      windows: z.string().max(4000).optional().or(z.literal("")),
      linux: z.string().max(4000).optional().or(z.literal("")),
    })
    .partial()
    .optional(),
  isPublished: z.boolean().optional(),
  isNewRelease: z.boolean().optional(),
  features: z.array(z.string().min(1).max(160)).max(50).optional(),
  size: z.string().max(20).optional().or(z.literal("")),
  // Release snapshot for old-version downloads (stored on AppVersion).
  tag: z.string().max(60).optional(),
  urls: z
    .object({
      android: z.string().max(4000).optional().or(z.literal("")),
      windows: z.string().max(4000).optional().or(z.literal("")),
      linux: z.string().max(4000).optional().or(z.literal("")),
    })
    .partial()
    .optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  await connectToDatabase();
  const app = await App.findOne(matchById(params.id)).lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}

// Merge-safe: only provided fields are updated, everything else (media, tutorial, keys) is preserved.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid app data", details: parsed.error.flatten() }, { status: 400 });
  await connectToDatabase();
  const app = await App.findOne(matchById(params.id));
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const data = parsed.data;
  if (data.downloadUrl) {
    const cur = (app.downloadUrl ?? {}) as Record<string, string>;
    const next: Record<string, string> = { ...cur };
    for (const [k, v] of Object.entries(data.downloadUrl)) {
      if (v) next[k] = v as string;
      else delete next[k];
    }
    app.downloadUrl = next;
  }
  for (const key of ["name", "description", "category", "pricing", "websiteUrl", "iconUrl", "isPublished", "isNewRelease", "size"] as const) {
    const v = data[key];
    if (v !== undefined) (app as unknown as Record<string, unknown>)[key] = v;
  }
  if (data.features !== undefined) {
    app.features = data.features.map((f) => f.trim()).filter(Boolean);
  }
  if (data.latestVersion !== undefined && data.latestVersion !== app.latestVersion) {
    app.latestVersion = data.latestVersion;
    try {
      await AppVersion.updateMany({ appId: app._id.toString(), isCurrent: true }, { isCurrent: false });
      if (data.latestVersion) {
        const urls = data.urls ? Object.fromEntries(Object.entries(data.urls).filter(([, v]) => v)) : undefined;
        await AppVersion.create({ appId: app._id.toString(), version: data.latestVersion, tag: data.tag || undefined, urls, notes: "Set from release", changedBy: email, isCurrent: true });
      }
    } catch {}
  }
  await app.save();
  return NextResponse.json({ data: app });
}
