import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

export const dynamic = "force-dynamic";

// Tutorials are public learning content, so this endpoint does not require login.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const tutorial = await App.findOne({ isPublished: true, $or: [{ _id: params.id }, { slug: params.id }] }).select("tutorial name slug updatedAt").lean() as { tutorial?: { isActive?: boolean; videoUrl?: string; sections?: Array<{ heading?: string; bodyMarkdown?: string }>; contentUpdatedAt?: Date }; name?: string; slug?: string; updatedAt?: Date } | null;
  if (!tutorial?.tutorial?.isActive) return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  const hasVideo = Boolean(tutorial.tutorial.videoUrl);
  const hasSections = Array.isArray(tutorial.tutorial.sections) && tutorial.tutorial.sections.length > 0;
  if (!hasVideo && !hasSections) return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  return NextResponse.json({ data: { ...tutorial.tutorial, appName: tutorial.name, appSlug: tutorial.slug } });
}
