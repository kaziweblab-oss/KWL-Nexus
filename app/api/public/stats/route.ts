import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// Public store counters only (no personal data). Powers the Apps directory stats bar.
export async function GET() {
  try {
    await connectToDatabase();
    const [apps, users, downloads] = await Promise.all([
      App.countDocuments({ isPublished: true }),
      User.countDocuments({}),
      App.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: "$downloadCount" } } },
      ]),
    ]);
    return NextResponse.json({
      data: { apps, users, downloads: (downloads[0] as { total?: number } | undefined)?.total ?? 0 },
    });
  } catch {
    return NextResponse.json({ data: { apps: 0, users: 0, downloads: 0 } });
  }
}
