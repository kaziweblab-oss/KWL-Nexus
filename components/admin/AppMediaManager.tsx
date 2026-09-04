"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Image as ImageIcon, Monitor, Video, Play } from "lucide-react";

export function AppMediaManager({ appId }: { appId: string }) {
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [screenshotVideo, setScreenshotVideo] = useState("");
  const [newShot, setNewShot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/apps/${appId}/media`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setScreenshots(d.data.screenshots ?? []);
          setPreviewImageUrl(d.data.previewImageUrl ?? "");
          setPreviewVideoUrl(d.data.previewVideoUrl ?? "");
          // if screenshotVideos exists, first is video
          if (d.data.screenshotVideos?.length) setScreenshotVideo(d.data.screenshotVideos[0] ?? "");
          else if (d.data.screenshots?.length && isVideoUrl(d.data.screenshots[0])) {
            setScreenshotVideo(d.data.screenshots[0]);
            setScreenshots(d.data.screenshots.slice(1));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appId]);

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|ogg)$/i) !== null || url.includes("youtube") || url.includes("vimeo");
  };

  const addScreenshot = () => {
    if (!newShot.trim()) return;
    setScreenshots([...screenshots, newShot.trim()]);
    setNewShot("");
  };

  const removeShot = (idx: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    // video always first
    const finalScreenshots = screenshotVideo ? [screenshotVideo, ...screenshots] : screenshots;
    const res = await fetch(`/api/admin/apps/${appId}/media`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshots: finalScreenshots, previewImageUrl, previewVideoUrl, screenshotVideos: screenshotVideo ? [screenshotVideo] : [] }),
    });
    if (res.ok) setMsg("Saved! Preview and screenshots updated. Video will appear first.");
    else {
      const err = await res.json().catch(() => ({}));
      setMsg(err.error ? JSON.stringify(err.error) : "Failed to save. Ensure app exists in DB (import from GitHub).");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  if (loading) return <p className="py-6 text-sm text-ink/40">Loading media...</p>;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><Monitor size={16} className="text-primary" /> Main Preview (Static Single)</h3>
      <p className="mt-1 text-xs text-ink/60 dark:text-white/60">Center preview static single. Paste image URL or video URL (mp4/youtube). Only one will be shown static (no slide).</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink/70 dark:text-white/70">Image URL<input value={previewImageUrl} onChange={(e) => setPreviewImageUrl(e.target.value)} placeholder="https://example.com/preview.png" className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
        <label className="text-xs font-semibold text-ink/70 dark:text-white/70">Video URL (optional)<input value={previewVideoUrl} onChange={(e) => setPreviewVideoUrl(e.target.value)} placeholder="https://example.com/preview.mp4 or youtube" className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
      </div>
      {(previewImageUrl || previewVideoUrl) && (
        <div className="mt-3 overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
          {previewVideoUrl ? (
            previewVideoUrl.includes("youtube") || previewVideoUrl.includes("vimeo") ? (
              <div className="aspect-video w-full bg-black flex items-center justify-center text-white text-sm">Video Preview: {previewVideoUrl}</div>
            ) : (
              <video src={previewVideoUrl} controls className="max-h-64 w-full object-contain bg-black" />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImageUrl} alt="Preview" className="max-h-64 w-full object-contain bg-[#0a0a14]" />
          )}
        </div>
      )}

      <h3 className="mt-8 flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><ImageIcon size={16} className="text-primary" /> Screenshots & Video</h3>
      <p className="mt-1 text-xs text-ink/60 dark:text-white/60">Video can be uploaded here and will always be first, then screenshots. Paste video (mp4/youtube) or image URLs.</p>
      <div className="mt-3 flex gap-2">
        <div className="flex-1 flex gap-2">
          <input value={screenshotVideo} onChange={(e) => setScreenshotVideo(e.target.value)} placeholder="Video URL (will be 1st) e.g. https://...mp4" className="flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2 text-xs font-semibold text-primary dark:bg-secondary/20 dark:text-secondary whitespace-nowrap"><Video size={12} /> Video 1st</span>
        </div>
      </div>
      {screenshotVideo && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:border-secondary/20 dark:bg-secondary/10">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary dark:text-secondary"><Play size={12} /> Video (1st): {screenshotVideo}</p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input value={newShot} onChange={(e) => setNewShot(e.target.value)} placeholder="Screenshot image URL https://..." className="flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
        <button onClick={addScreenshot} className="inline-flex items-center gap-1 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {screenshots.map((url, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-xl border border-ink/10 bg-white p-2 dark:border-white/10 dark:bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Screenshot ${idx + 2}`} className="h-32 w-full rounded-lg object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">#{idx + 2}</span>
            <button onClick={() => removeShot(idx)} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-red-600 shadow-md hover:bg-red-50 dark:bg-[#1a1a2e] dark:text-red-400">
              <Trash2 size={14} />
            </button>
            <p className="mt-2 truncate text-xs text-ink/60 dark:text-white/60">{url}</p>
          </div>
        ))}
        {screenshots.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-ink/40">No screenshots yet. Add URLs above. Video will be #1 if set.</p>}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 dark:bg-secondary dark:text-ink">
          <Save size={16} /> {saving ? "Saving..." : "Save Media"}
        </button>
        {msg && <span className="text-sm text-emerald-600 dark:text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
}
