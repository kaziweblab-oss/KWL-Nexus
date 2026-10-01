/* eslint-disable @typescript-eslint/no-explicit-any */
import App from "@/models/App";
import Release from "@/models/Release";
import AppVersion from "@/models/AppVersion";

export type V1Asset = { name?: string; url?: string; contentType?: string; size?: number; platform?: string; arch?: string | null; checksumSha256?: string | null };

// Compare dotted versions ("v1.2.3" == "1.2.3"). Returns -1/0/1.
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) => v.trim().replace(/^v/i, "");
  const pa = norm(a).split(".");
  const pb = norm(b).split(".");
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const xa = parseInt(pa[i] ?? "0", 10);
    const xb = parseInt(pb[i] ?? "0", 10);
    const na = Number.isNaN(xa) ? 0 : xa;
    const nb = Number.isNaN(xb) ? 0 : xb;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  // Same numbers: a suffixed build (1.0.0-beta) sorts below the plain release.
  const sa = /[-+]/.test(norm(a)) ? 0 : 1;
  const sb = /[-+]/.test(norm(b)) ? 0 : 1;
  if (sa !== sb) return sa < sb ? -1 : 1;
  return 0;
}

// Pick the best asset for platform (+ optional arch). Exact platform+arch wins,
// then platform-only. Never throws — returns null when nothing fits.
export function resolveAsset(assets: V1Asset[], platform?: string | null, arch?: string | null): V1Asset | null {
  if (!assets?.length) return null;
  const plat = (platform ?? "").toLowerCase();
  const candidates = plat ? assets.filter((x) => String(x.platform ?? "").toLowerCase() === plat) : assets;
  if (!candidates.length) return null;
  const wantArch = (arch ?? "").toLowerCase();
  if (wantArch) {
    const exact = candidates.find((x) => String(x.arch ?? "").toLowerCase() === wantArch);
    if (exact) return exact;
  }
  return candidates[0];
}

export async function getLatestInfo(
  slug: string,
  opts: { platform?: string | null; arch?: string | null; current?: string | null },
): Promise<{ app: any; version: string; release: any | null; asset: V1Asset | null; updateAvailable: boolean } | null> {
  const app = (await App.findOne({ slug: slug.toLowerCase(), isPublished: true }).lean()) as any;
  if (!app) return null;
  const pointer = String(app.latestVersion ?? "").trim();
  // 1) Release matching the admin pointer. 2) Newest stable synced release.
  // 3) Manual current snapshot. Pointer stays the source of truth.
  let release: any = null;
  if (pointer) {
    release = (await Release.findOne({
      tagName: pointer,
      $or: [{ appId: app._id }, ...(app.githubOwner && app.githubRepo ? [{ githubOwner: app.githubOwner, githubRepo: app.githubRepo }] : [])],
    }).lean()) as any;
  }
  if (!release) {
    release = (await Release.find({
      $or: [{ appId: app._id }, ...(app.githubOwner && app.githubRepo ? [{ githubOwner: app.githubOwner, githubRepo: app.githubRepo }] : [])],
      prerelease: { $ne: true },
      draft: { $ne: true },
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(1)
      .lean()) as any[];
    release = Array.isArray(release) ? release[0] ?? null : release;
  }
  let version = pointer || null;
  if (release?.tagName) version = String(release.tagName);
  if (!version) {
    const snap = (await AppVersion.findOne({ appId: String(app._id), isCurrent: true }).sort({ createdAt: -1 }).lean()) as { version?: string } | null;
    if (snap?.version) version = String(snap.version);
  }
  if (!version) version = "0.0.0";
  const asset = release ? resolveAsset((release.assets ?? []) as V1Asset[], opts.platform, opts.arch) : null;
  const updateAvailable = opts.current ? compareVersions(String(opts.current), version) < 0 : false;
  return { app, version, release, asset, updateAvailable };
}

export function publicAppFields(app: any) {
  // Never leak private fields (tokens, configs, internal flags).
  return {
    slug: app.slug,
    name: app.name,
    description: app.description,
    category: app.category,
    pricing: app.pricing,
    latestVersion: app.latestVersion ?? null,
    updatedAt: app.updatedAt ?? null,
  };
}
