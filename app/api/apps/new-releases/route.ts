import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

// Public: latest new-release flagged apps, fallback to newest 3
export async function GET() {
  try {
    await connectToDatabase();
    const flagged = await App.find({ isPublished: true, isNewRelease: true }).sort({ newReleaseOrder: 1, updatedAt: -1 }).limit(3).lean();
    if (flagged.length) {
      return NextResponse.json({ data: flagged.map((a) => ({ id: a._id.toString(), slug: a.slug, name: a.name, category: a.category, description: a.description, accent: "#6C63FF", icon: a.name.slice(0,1).toUpperCase(), iconUrl: (a as { iconUrl?: string }).iconUrl || null, downloads: String((a as { downloadCount?: number }).downloadCount ?? 0), downloadCount: (a as { downloadCount?: number }).downloadCount ?? 0, newReleaseImageUrl: (a as { newReleaseImageUrl?: string }).newReleaseImageUrl || null, latestVersion: (a as { latestVersion?: string }).latestVersion || null })) });
    }
    const fallback = await App.find({ isPublished: true }).sort({ createdAt: -1 }).limit(3).lean();
    if (fallback.length) {
      return NextResponse.json({ data: fallback.map((a) => ({ id: a._id.toString(), slug: a.slug, name: a.name, category: a.category, description: a.description, accent: "#6C63FF", icon: a.name.slice(0,1).toUpperCase(), iconUrl: (a as { iconUrl?: string }).iconUrl || null, downloads: String((a as { downloadCount?: number }).downloadCount ?? 0), downloadCount: (a as { downloadCount?: number }).downloadCount ?? 0, newReleaseImageUrl: (a as { newReleaseImageUrl?: string }).newReleaseImageUrl || null, latestVersion: (a as { latestVersion?: string }).latestVersion || null })) });
    }
    return NextResponse.json({ data: [] });
  } catch {
    // fallback to empty so client uses dummy
    return NextResponse.json({ data: [] });
  }
}
