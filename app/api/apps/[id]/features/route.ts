import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, assertKeyScope, touchKeyApp } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";

const schema = z.object({ features: z.array(z.string().min(1).max(160)).max(50) });

function matchById(id: string) {
  if (isValidObjectId(id)) return { _id: id };
  return { slug: id };
}

// Desktop apps push their own feature list here (x-api-key auth, same as feedback).
// Replace semantics: what the app sends becomes the master list (last-write-wins
// with admin manual edits in the editor).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid features", details: parsed.error.flatten() }, { status: 400 });
  await connectToDatabase();
  const app = await App.findOne(matchById(params.id));
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const scoped = await assertKeyScope(auth, { slug: (app as { slug?: string }).slug, id: String((app as { _id: unknown })._id) }).catch(() => null);
  if (scoped) return NextResponse.json({ error: scoped.error }, { status: scoped.status });
  app.features = parsed.data.features.map((f) => f.trim()).filter(Boolean);
  app.featuresSource = "app";
  app.featuresUpdatedAt = new Date();
  app.apiLastSeenAt = new Date();
  await app.save();
  if ("apiKeyId" in auth) touchKeyApp(auth.apiKeyId, (app as { slug?: string }).slug);
  return NextResponse.json({ data: { count: app.features.length } }, { status: 200 });
}

// Current master list (lets apps compare before pushing).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const app = await App.findOne(matchById(params.id)).select("features name slug").lean() as unknown as { features?: string[]; slug?: string; _id?: unknown } | null;
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const scoped = await assertKeyScope(auth, { slug: app.slug, id: app._id ? String(app._id) : undefined }).catch(() => null);
  if (scoped) return NextResponse.json({ error: scoped.error }, { status: scoped.status });
  return NextResponse.json({ data: { features: app.features ?? [] } });
}
