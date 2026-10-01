import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { v1ok, v1err } from "@/lib/v1/respond";
import { publicAppFields } from "@/lib/v1/latest";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

// Public app metadata by slug. No private fields, no secrets.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = clientIp(req);
  if (!checkRateLimit(`v1:ip:${ip}`, 600, 60 * 60 * 1000)) {
    return v1err("RATE_LIMITED", "Too many requests. Please try again later.", 429);
  }
  await connectToDatabase();
  const app = await App.findOne({ slug: params.slug.toLowerCase(), isPublished: true })
    .select("slug name description category pricing latestVersion updatedAt")
    .lean();
  if (!app) return v1err("APP_NOT_FOUND", "App not found", 404);
  return v1ok({ app: publicAppFields(app) });
}
