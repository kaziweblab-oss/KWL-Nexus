import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { v1ok, v1err } from "@/lib/v1/respond";
import { publicAppFields } from "@/lib/v1/latest";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

// Public catalog: published apps only, minimal fields, paginated.
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`v1:ip:${ip}`, 600, 60 * 60 * 1000)) {
    return v1err("RATE_LIMITED", "Too many requests. Please try again later.", 429);
  }
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));
  const category = req.nextUrl.searchParams.get("category")?.trim();
  await connectToDatabase();
  const filter: Record<string, unknown> = { isPublished: true };
  if (category) filter.category = category;
  const [apps, total] = await Promise.all([
    App.find(filter).select("slug name description category pricing latestVersion updatedAt").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    App.countDocuments(filter),
  ]);
  return v1ok({ apps: (apps as unknown[]).map(publicAppFields), page, limit, total });
}
