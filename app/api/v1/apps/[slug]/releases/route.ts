/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import Release from "@/models/Release";
import { v1ok, v1err } from "@/lib/v1/respond";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

// Public changelog ("what's new"): stable synced releases only — no drafts,
// no prereleases, no asset bytes, no secrets. Desktop Help views consume this.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = clientIp(req);
  if (!checkRateLimit(`v1:ip:${ip}`, 600, 60 * 60 * 1000)) {
    return v1err("RATE_LIMITED", "Too many requests. Please try again later.", 429);
  }
  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 10) || 10));
  await connectToDatabase();
  const slug = String(params.slug ?? "").toLowerCase();
  if (!slug) return v1err("APP_NOT_FOUND", "App not found", 404);
  const app = (await App.findOne({ slug, isPublished: true }).select("_id slug githubOwner githubRepo").lean()) as any;
  if (!app) return v1err("APP_NOT_FOUND", "App not found", 404);
  const or: Record<string, unknown>[] = [{ appId: app._id }];
  if (app.githubOwner && app.githubRepo) or.push({ githubOwner: app.githubOwner, githubRepo: app.githubRepo });
  const releases = (await Release.find({ $or: or, prerelease: { $ne: true }, draft: { $ne: true } })
    .select("tagName name body publishedAt assets.platform assets.arch assets.size")
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean()) as any[];
  return v1ok({
    app: slug,
    releases: releases.map((r) => ({
      tag: r.tagName,
      name: r.name ?? r.tagName,
      notes: r.body ?? null,
      publishedAt: r.publishedAt ?? null,
      platforms: Array.from(new Set((r.assets ?? []).map((a: any) => a.platform).filter(Boolean))),
    })),
  });
}
