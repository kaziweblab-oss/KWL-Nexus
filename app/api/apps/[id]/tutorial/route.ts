import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

export const dynamic = "force-dynamic";

// Tutorials are public learning content, so this endpoint does not require login.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const tutorial = await App.findOne({ isPublished: true, $or: [{ _id: params.id }, { slug: params.id }] }).select("tutorial name slug").lean();
  if (!tutorial?.tutorial?.isActive || !tutorial.tutorial.videoUrl) return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
  return NextResponse.json({ data: { ...tutorial.tutorial, appName: tutorial.name, appSlug: tutorial.slug } });
}
