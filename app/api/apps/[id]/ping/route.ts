import { NextResponse } from "next/server";
import { authenticateApiRequest, assertKeyScope, touchKeyApp } from "@/lib/api/auth";
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
  const existing = await App.findOne(filter).select("_id slug").lean() as unknown as { _id?: unknown; slug?: string } | null;
  if (!existing) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const scoped = await assertKeyScope(auth, { slug: existing.slug, id: existing._id ? String(existing._id) : undefined }).catch(() => null);
  if (scoped) return NextResponse.json({ error: scoped.error }, { status: scoped.status });
  const app = await App.findOneAndUpdate(filter, { apiLastSeenAt: new Date() }, { new: true })
    .select("name slug apiLastSeenAt")
    .lean() as unknown as { name?: string; slug?: string; apiLastSeenAt?: Date } | null;
  if ("apiKeyId" in auth && app?.slug) touchKeyApp(auth.apiKeyId, app.slug);
  return NextResponse.json({ data: { connected: true, app: app?.slug, at: app?.apiLastSeenAt } });
}
