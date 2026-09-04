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
  accent?: string;
  iconUrl?: string;
  downloadCount?: number;
  newReleaseImageUrl?: string;
  latestVersion?: string;
}) {
  const id = (app as unknown as { _id?: unknown })._id?.toString() || app.slug || app.name.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    slug: app.slug || id,
    name: app.name,
    category: app.category || "Development",
    description: app.description || "",
    accent: (app as unknown as { accent?: string }).accent || "#6C63FF",
    icon: app.name.slice(0, 1).toUpperCase(),
    iconUrl: (app as unknown as { iconUrl?: string }).iconUrl || null,
    downloads: (app as unknown as { downloads?: string }).downloads || undefined,
    downloadCount: (app as unknown as { downloadCount?: number }).downloadCount ?? 0,
    newReleaseImageUrl: (app as unknown as { newReleaseImageUrl?: string }).newReleaseImageUrl || null,
    latestVersion: (app as unknown as { latestVersion?: string }).latestVersion || null,
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const count = await App.countDocuments({ isPublished: true });
    if (count === 0) {
      return NextResponse.json({ data: [] });
    }

    const agg = await App.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$downloadCount", 0] } } } },
    ]);
    const totalDownloads: number = agg[0]?.total ?? 0;

    // Threshold: if total downloads very low, show newest / all instead of sorted by downloads
    if (totalDownloads < 10) {
      const newest = await App.find({ isPublished: true }).sort({ createdAt: -1 }).limit(10).lean();
      return NextResponse.json({ data: newest.map((a) => toCard(a as unknown as Parameters<typeof toCard>[0])) });
    }

    // Show top 5-10 most downloaded
    const popular = await App.find({ isPublished: true }).sort({ downloadCount: -1, updatedAt: -1 }).limit(10).lean();
    return NextResponse.json({ data: popular.map((a) => toCard(a as unknown as Parameters<typeof toCard>[0])) });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
