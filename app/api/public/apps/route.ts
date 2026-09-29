import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

export const dynamic = "force-dynamic";

function toCard(app: {
  _id?: unknown;
  slug?: string;
  name: string;
  category: string;
  description?: string;
  iconUrl?: string;
  downloadCount?: number;
  latestVersion?: string;
  downloadUrl?: { android?: string; windows?: string; linux?: string; apk?: string; exe?: string; deb?: string };
}) {
  const id = (app as unknown as { _id?: unknown })._id?.toString() || app.slug || app.name.toLowerCase().replace(/\s+/g, "-");
  // Real platforms derived from stored download URLs (no hardcoded claims).
  const urls = app.downloadUrl ?? {};
  const platforms: string[] = [];
  if (urls.android || urls.apk) platforms.push("Android");
  if (urls.windows || urls.exe) platforms.push("Windows");
  if (urls.linux || urls.deb) platforms.push("Linux");
  return {
    id,
    slug: app.slug || id,
    name: app.name,
    category: app.category || "Development",
    description: app.description || "",
    accent: "#6C63FF",
    icon: app.name.slice(0, 1).toUpperCase(),
    iconUrl: (app as unknown as { iconUrl?: string }).iconUrl || null,
    downloads: String(app.downloadCount ?? 0),
    downloadCount: app.downloadCount ?? 0,
    latestVersion: app.latestVersion || null,
    platforms,
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const apps = await App.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: apps.map((a) => toCard(a as unknown as Parameters<typeof toCard>[0])) });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
