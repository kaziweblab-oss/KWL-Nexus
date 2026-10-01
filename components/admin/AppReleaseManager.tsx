"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, FileArchive, FileJson, FileSignature, FileText, Loader2, Package, RefreshCw } from "lucide-react";

type Asset = { name: string; size: number; downloads: number; url: string };
type Release = { id: number; tag: string; name: string; body: string | null; draft: boolean; prerelease: boolean; publishedAt: string | null; url: string; assets: Asset[] };

function pickUrls(assets: Asset[]) {
  const find = (ext: string) => assets.find((a) => a.name.toLowerCase().endsWith(ext))?.url ?? "";
  // Windows prefers NSIS .exe, falls back to .msi; Linux prefers .deb, falls back to .AppImage.
  return { android: find(".apk"), windows: find(".exe") || find(".msi"), linux: find(".deb") || find(".appimage") };
}

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// GitHub releases -> version + .apk/.exe/.deb download URLs, applied to the app in one click.
export function AppReleaseManager({ owner, repo, appSlug, currentVersion, onApplied }: { owner: string; repo: string; appSlug: string; currentVersion?: string | null; onApplied: () => void }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");

  function assetIcon(name: string) {
    const n = name.toLowerCase();
    if (n.endsWith(".sig")) return { Icon: FileSignature, cls: "text-slate-400" };
    if (n.endsWith(".json")) return { Icon: FileJson, cls: "text-amber-500" };
    if (n.endsWith(".apk") || n.endsWith(".exe") || n.endsWith(".msi") || n.endsWith(".deb") || n.endsWith(".dmg") || n.endsWith(".appimage")) return { Icon: Download, cls: "text-emerald-500" };
    if (n.endsWith(".zip") || n.endsWith(".tar.gz") || n.endsWith(".tgz")) return { Icon: FileArchive, cls: "text-primary" };
    return { Icon: FileText, cls: "text-ink/40 dark:text-white/40" };
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(""), 2000);
    } catch {}
  }

  async function load() {
    if (!owner || !repo) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/releases`, { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error ?? `Failed to load releases (${res.status})`);
      setReleases(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load releases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [owner, repo]);

  async function applyRelease(rel: Release) {
    setApplying(rel.id);
    setMsg("");
    setError("");
    try {
      const urls = pickUrls(rel.assets);
      const version = rel.tag.replace(/^v/i, "");
      const mappedBytes = [urls.android && rel.assets.find((a) => a.url === urls.android)?.size, urls.windows && rel.assets.find((a) => a.url === urls.windows)?.size, urls.linux && rel.assets.find((a) => a.url === urls.linux)?.size].filter((n): n is number => typeof n === "number" && n > 0);
      const biggest = Math.max(mappedBytes.length ? Math.max(...mappedBytes) : 0, ...rel.assets.map((a) => a.size ?? 0));
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(appSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latestVersion: version, downloadUrl: urls, size: biggest > 0 ? fmtSize(biggest) : "", tag: rel.tag, urls }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to apply release");
      setMsg(`v${version} applied (.apk/.exe/.deb mapped). Publish from above when ready.`);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply release");
    } finally {
      setApplying(null);
    }
  }

  if (!owner || !repo) {
    return <p className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/50 dark:border-white/10 dark:text-white/50">Link a GitHub owner/repo to load releases.</p>;
  }
  if (loading) {
    return <p className="flex items-center gap-2 rounded-xl bg-paper p-6 text-sm text-ink/50 dark:bg-white/5 dark:text-white/50"><Loader2 size={16} className="animate-spin" /> Loading releases for {owner}/{repo}…</p>;
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        <p className="font-semibold">Releases unavailable: {error}</p>
        <p className="mt-1 text-xs">Check the GitHub PAT in Settings → Project integrations, then</p>
        <button onClick={() => void load()} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600"><RefreshCw size={12} /> Retry</button>
      </div>
    );
  }
  if (!releases.length) {
    return <p className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink/50 dark:border-white/10 dark:text-white/50">No releases on {owner}/{repo} yet. Publish a GitHub release with .apk/.exe/.deb assets first.</p>;
  }

  return (
    <div className="grid gap-3">
      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{msg}</p>}
      {releases.map((rel) => {
        const urls = pickUrls(rel.assets);
        const isCurrent = currentVersion != null && currentVersion !== "" && rel.tag.replace(/^v/i, "") === currentVersion.replace(/^v/i, "");
        return (
          <article key={rel.id} className={`rounded-2xl border p-5 dark:bg-white/[0.02] ${isCurrent ? "border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-ink/10 bg-white dark:border-white/10"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary dark:text-secondary"><Package size={18} /></span>
                <div>
                  <p className="font-bold text-ink dark:text-white">{rel.name || rel.tag} {isCurrent && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">Current</span>}</p>
                  <p className="text-xs text-ink/50 dark:text-white/50">{rel.tag}{rel.prerelease ? " · prerelease" : ""}{rel.publishedAt ? ` · ${new Date(rel.publishedAt).toLocaleDateString()}` : ""}</p>
                </div>
              </div>
              {!isCurrent && (
                <button disabled={applying === rel.id} onClick={() => void applyRelease(rel)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50">
                  {applying === rel.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Use this release
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-1.5 text-xs">
              {(Object.entries(urls) as [string, string][]).map(([platform, url]) => (
                <div key={platform} className="flex min-w-0 items-center gap-1.5 rounded-lg bg-paper px-2.5 py-2 dark:bg-white/[0.04]">
                  <Download size={11} className={`shrink-0 ${url ? "text-emerald-500" : "text-ink/25"}`} />
                  <span className="w-16 shrink-0 font-bold capitalize text-ink/70 dark:text-white/70">{platform}</span>
                  {url ? (
                    <>
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink/60 dark:text-white/60">{url}</span>
                      <button onClick={() => void copyUrl(url)} title="Copy URL" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink/40 hover:bg-ink/5 hover:text-primary dark:text-white/40">
                        {copied === url ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-ink/35 dark:text-white/30">— no asset</span>
                  )}
                </div>
              ))}
              <details className="rounded-lg bg-paper px-2.5 py-2 dark:bg-white/[0.04]">
                <summary className="cursor-pointer text-[11px] font-semibold text-ink/50 hover:text-primary dark:text-white/50">
                  All {rel.assets.length} asset(s)
                </summary>
                <ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto pr-1">
                  {rel.assets.map((a) => {
                    const { Icon, cls } = assetIcon(a.name);
                    return (
                      <li key={a.name} className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink/60 dark:text-white/60">
                        <Icon size={12} className={`shrink-0 ${cls}`} />
                        <span className="min-w-0 flex-1 truncate font-mono">{a.name}</span>
                        <span className="shrink-0 rounded-full bg-ink/5 px-1.5 py-0.5 font-semibold dark:bg-white/10">{fmtSize(a.size)}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          </article>
        );
      })}
    </div>
  );
}
