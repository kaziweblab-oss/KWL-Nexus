import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import UpdateGuideline from "@/models/UpdateGuideline";

export const dynamic = "force-dynamic";

// GET /api/update-guidelines — সব অ্যাপে অটো আপডেট, ইউজার নতুন গাইডলাইন দেখবে
export async function GET() {
  try {
    await connectToDatabase();
    let doc = await UpdateGuideline.findOne().sort({ updatedAt: -1 }).lean();
    if (!doc) {
      doc = await UpdateGuideline.create({ content: "1. Update your app to the latest version.\n2. Backup your data before updating.\n3. Follow the official KWL-NEXUS guidelines." });
    }
    return NextResponse.json({ data: doc }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET update-guidelines failed:", error);
    return NextResponse.json({ error: "Failed to load guidelines" }, { status: 500 });
  }
}
