import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import Release from "@/models/Release";
import { detectPlatform } from "@/lib/github/client";

type GithubReleasePayload = { action: string; release?: { tag_name: string; name: string | null; body: string | null; published_at: string | null; assets: { name: string; browser_download_url: string; content_type: string; size: number }[]; target_commitish: string }; repository?: { name: string; owner: { login: string } } };

function isValidSignature(payload: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Store published GitHub releases and classify installable assets for each platform.
export async function POST(request: Request) {
  const payload = await request.text();
  if (!isValidSignature(payload, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  const event = request.headers.get("x-github-event");
  if (event !== "release") return NextResponse.json({ received: true, ignored: true });
  const data = JSON.parse(payload) as GithubReleasePayload;
  if (!data.release || !data.repository || !["published", "created"].includes(data.action)) return NextResponse.json({ received: true, ignored: true });
  await connectToDatabase();
  await Release.findOneAndUpdate({ githubOwner: data.repository.owner.login, githubRepo: data.repository.name, tagName: data.release.tag_name }, { githubOwner: data.repository.owner.login, githubRepo: data.repository.name, tagName: data.release.tag_name, name: data.release.name, body: data.release.body, publishedAt: data.release.published_at, assets: data.release.assets.filter((asset) => ["Android", "Windows", "Linux"].includes(detectPlatform(asset.name))).map((asset) => ({ name: asset.name, url: asset.browser_download_url, contentType: asset.content_type, size: asset.size, platform: detectPlatform(asset.name) })) }, { upsert: true, new: true });
  return NextResponse.json({ received: true, tag: data.release.tag_name });
}
