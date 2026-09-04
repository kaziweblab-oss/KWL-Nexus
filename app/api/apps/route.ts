import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

// List published apps for SDKs and external consumers.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const apps = await App.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: apps, meta: { count: apps.length, rateLimitPerHour: 1000 } });
}
