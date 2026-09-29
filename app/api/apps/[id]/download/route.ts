import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { getEffectiveGithubToken, githubFetch } from "@/lib/github/client";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/apps/[id]/download — User clicks Download → auto generate URL (private release asset via PAT if needed)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { id } = params;
  const url = new URL(request.url);
  const asset = url.searchParams.get("asset"); // optional specific asset name
  const tag = url.searchParams.get("tag");
  const platform = url.searchParams.get("platform"); // android | windows | linux

  await connectToDatabase();

  // Find app by id/slug
  let app: unknown = null;
  if (mongoose.Types.ObjectId.isValid(id)) app = await App.findById(id).lean();
  if (!app) app = await App.findOne({ slug: id }).lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const appDoc = app as { _id: unknown; slug: string; name: string; githubOwner?: string; githubRepo?: string; latestVersion?: string };
  const owner = appDoc.githubOwner;
  const repo = appDoc.githubRepo;

  // Real download counter for popular ranking (non-blocking).
  async function bumpCount() {
    try {
      const idStr = String((appDoc._id as { toString(): string }).toString());
      if (mongoose.Types.ObjectId.isValid(idStr)) await App.findByIdAndUpdate(appDoc._id, { $inc: { downloadCount: 1 } }).exec();
      else if (appDoc.slug) await App.findOneAndUpdate({ slug: appDoc.slug }, { $inc: { downloadCount: 1 } }).exec();
    } catch {}
  }

  // If app has GitHub repo linked, try to generate private release asset URL via PAT
  if (owner && repo) {
    try {
      // Get token (PAT) — for private repo, this will authenticate the download URL
      const token = await getEffectiveGithubToken(null);
      // Fetch latest release or specific tag
      const path = tag ? `/repos/${owner}/${repo}/releases/tags/${tag}` : `/repos/${owner}/${repo}/releases/latest`;
      const release = await githubFetch<{ tag_name: string; assets: { name: string; browser_download_url: string }[] }>(path, token ?? "");
      const pickForPlatform = (plat: string | null) => {
        if (!plat) return null;
        const ext = plat.toLowerCase() === "android" ? ".apk" : plat.toLowerCase() === "windows" ? [".exe", ".msi"] : plat.toLowerCase() === "linux" ? [".deb", ".appimage"] : null;
        if (!ext) return null;
        const exts = Array.isArray(ext) ? ext : [ext];
        return release.assets.find((x) => exts.some((e) => x.name.toLowerCase().endsWith(e)))?.browser_download_url ?? null;
      };
      let downloadUrl: string | null = null;
      if (asset) {
        const a = release.assets.find((x) => x.name === asset);
        downloadUrl = a?.browser_download_url ?? null;
      } else if (platform) {
        // Tag + platform combo (old-version downloads): prefer platform asset, error if missing.
        downloadUrl = pickForPlatform(platform);
        if (!downloadUrl) {
          return NextResponse.json({ error: `No ${platform} build in ${release.tag_name}.` }, { status: 404 });
        }
      } else {
        // Prefer apk/exe/deb matching platform, fallback to first asset
        downloadUrl = release.assets[0]?.browser_download_url ?? null;
      }
      if (downloadUrl) {
        // For private repos, the browser_download_url requires Authorization header.
        // We redirect with token via api proxy: return URL that client will fetch with auth via /api/github asset proxy
        // Simplest: return the GitHub URL — browser will follow redirect; for private, user must be authenticated via token on server side.
        // To make auto-download work for private, we proxy via server:
        // Return our proxy URL: /api/github/repos/[owner]/[repo]/releases/asset?url=...
        // For now, return direct GitHub URL with token hint
        await bumpCount();
        return NextResponse.json({
          downloadUrl,
          version: release.tag_name,
          private: true,
          note: "Private repo — use Authorization: Bearer <PAT> header or admin proxy",
          // Proxy URL for auto download (server will fetch with PAT and stream)
          proxyUrl: `/api/github/repos/${owner}/${repo}/releases/download?asset=${encodeURIComponent(asset ?? release.assets[0].name)}`,
        });
      }
    } catch {
      // Fallback to stored downloadUrl
    }
  }

  // Fallback: stored downloadUrl in App model
  const stored = (app as unknown as { downloadUrl?: { android?: string; windows?: string; linux?: string } })?.downloadUrl;
  // Explicit platform choice wins (admin-curated per-platform build).
  if (platform && stored) {
    const key = platform.toLowerCase() as keyof NonNullable<typeof stored>;
    if (["android", "windows", "linux"].includes(key) && stored[key]) {
      await bumpCount();
      return NextResponse.json({ downloadUrl: stored[key], version: (app as unknown as { latestVersion?: string }).latestVersion ?? "1.0.0", platform: key });
    }
    return NextResponse.json({ error: `No ${platform} build published for this app yet.` }, { status: 404 });
  }
  const fallback = stored?.android ?? stored?.windows ?? stored?.linux;
  if (fallback) {
    await bumpCount();
    return NextResponse.json({ downloadUrl: fallback, version: (app as unknown as { latestVersion: string }).latestVersion ?? "1.0.0" });
  }

  return NextResponse.json({ error: "No downloadable release found. Publish a release with assets." }, { status: 404 });
}
