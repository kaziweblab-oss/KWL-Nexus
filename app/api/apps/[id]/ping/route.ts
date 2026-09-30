import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

// Desktop heartbeat: tells Nexus the app integration is live (key + appId configured).
// Editors show "connected" state based on apiLastSeenAt.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const filter = isValidObjectId(params.id) ? { _id: params.id } : { slug: params.id };
  const app = await App.findOneAndUpdate(filter, { apiLastSeenAt: new Date() }, { new: true })
    .select("name slug apiLastSeenAt")
    .lean() as unknown as { name?: string; slug?: string; apiLastSeenAt?: Date } | null;
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: { connected: true, app: app.slug, at: app.apiLastSeenAt } });
}
