/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { v1ok, v1err } from "@/lib/v1/respond";
import { getLatestInfo, publicAppFields } from "@/lib/v1/latest";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

const PLATFORMS = ["windows", "android", "linux"];

// Update manifest for desktop apps:
// GET /api/v1/apps/:slug/latest?platform=windows&arch=x64&current=1.2.0
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = clientIp(req);
  if (!checkRateLimit(`v1:ip:${ip}`, 600, 60 * 60 * 1000)) {
    return v1err("RATE_LIMITED", "Too many requests. Please try again later.", 429);
  }
  const q = req.nextUrl.searchParams;
  const platform = q.get("platform")?.toLowerCase() ?? null;
  const arch = q.get("arch")?.toLowerCase() ?? null;
  const current = q.get("current") ?? q.get("current_version") ?? null;
  if (platform && !PLATFORMS.includes(platform)) {
    return v1err("INVALID_PLATFORM", "platform must be one of: windows, android, linux", 400);
  }
  await connectToDatabase();
  const info = await getLatestInfo(params.slug, { platform, arch, current });
  if (!info) return v1err("APP_NOT_FOUND", "App not found", 404);
  const r = info.release as any;
  const releaseUrl = r?.githubOwner && r?.githubRepo && r?.tagName
    ? `https://github.com/${r.githubOwner}/${r.githubRepo}/releases/tag/${r.tagName}`
    : null;
  return v1ok({
    app: publicAppFields(info.app),
    version: info.version,
    release: r ? { tag: r.tagName, name: r.name ?? null, notes: r.body ?? null, publishedAt: r.publishedAt ?? null, prerelease: !!r.prerelease, url: releaseUrl } : null,
    asset: info.asset
      ? { file: info.asset.name ?? null, url: info.asset.url ?? null, size: info.asset.size ?? null, platform: info.asset.platform ?? null, arch: info.asset.arch ?? null, checksumSha256: (info.asset as any).checksumSha256 ?? null }
      : null,
    updateAvailable: info.updateAvailable,
  });
}
