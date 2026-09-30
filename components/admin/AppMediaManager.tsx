"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Image as ImageIcon, Monitor, Video, Play } from "lucide-react";

export function AppMediaManager({ appId }: { appId: string }) {
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewFileMsg, setPreviewFileMsg] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [screenshotVideo, setScreenshotVideo] = useState("");
  const [videoFileMsg, setVideoFileMsg] = useState("");
  const [newShot, setNewShot] = useState("");
  const [shotFileMsg, setShotFileMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Client-side image prep: resize to max 1280px JPEG (keeps DB + pages lean).
  function prepImageFile(file: File, maxDim: number, maxBytes: number, done: (url: string) => void, fail: (m: string) => void) {
    if (!file.type.startsWith("image/")) { fail("Only image files."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("canvas");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const url = canvas.toDataURL("image/jpeg", 0.82);
          if (url.length > maxBytes * 1.37 + 1000) { fail("Still too large after resize — use a smaller image or URL."); return; }
          done(url);
        } catch {
          // Fallback: raw base64 when canvas fails (e.g. SVG without intrinsic size)
          if (file.size > maxBytes) { fail("Image too large — use a smaller file or URL."); return; }
          const fallback = new FileReader();
          fallback.onload = () => done(String(fallback.result));
          fallback.readAsDataURL(file);
        }
      };
      img.onerror = () => fail("Could not read that image.");
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleVideoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setVideoFileMsg("Only video files (mp4/webm)."); return; }
    if (file.size > 20_000_000) { setVideoFileMsg("Video max 20MB — use a YouTube/unlisted link for bigger videos."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotVideo(String(reader.result));
      setVideoFileMsg(`Loaded ${file.name} — Save Media to apply.`);
    };
    reader.readAsDataURL(file);
  }

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
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><Monitor size={16} className="text-primary" /> Main Preview (image only)</h3>
      <p className="mt-1 text-xs text-ink/60 dark:text-white/60">Single static image. Upload a file or paste an image URL.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 text-sm font-semibold text-ink hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-white">
          Upload image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) prepImageFile(f, 1280, 1_000_000, (url) => { setPreviewImageUrl(url); setPreviewFileMsg(`Loaded ${f.name} — Save Media to apply.`); }, setPreviewFileMsg); }} />
        </label>
        <input value={previewImageUrl.startsWith("data:") ? "" : previewImageUrl} onChange={(e) => { setPreviewImageUrl(e.target.value); setPreviewFileMsg(""); }} placeholder="…or paste image URL https://…" className="h-10 flex-1 rounded-xl border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
      </div>
      {previewFileMsg && <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{previewFileMsg}</p>}
      {previewImageUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImageUrl} alt="Preview" className="max-h-64 w-full object-contain bg-[#0a0a14]" />
        </div>
      )}

      <h3 className="mt-8 flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><ImageIcon size={16} className="text-primary" /> Preview gallery (1 video + images)</h3>
      <p className="mt-1 text-xs text-ink/60 dark:text-white/60">Video first, then preview images. Upload files or paste URLs (mp4/webm/youtube for video).</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 text-sm font-semibold text-ink hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-white">
          Upload video
          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleVideoFile(e.target.files?.[0])} />
        </label>
        <input value={screenshotVideo.startsWith("data:") ? "" : screenshotVideo} onChange={(e) => { setScreenshotVideo(e.target.value); setVideoFileMsg(""); }} placeholder="…or paste video URL (will be 1st) e.g. https://...mp4" className="h-10 flex-1 rounded-xl border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
        <span className="inline-flex items-center gap-1 self-start rounded-xl bg-primary/10 px-2 py-2 text-xs font-semibold text-primary dark:bg-secondary/20 dark:text-secondary whitespace-nowrap sm:self-center"><Video size={12} /> Video 1st</span>
      </div>
      {videoFileMsg && <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{videoFileMsg}</p>}
      {screenshotVideo && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:border-secondary/20 dark:bg-secondary/10">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary dark:text-secondary"><Play size={12} /> Video (1st): {screenshotVideo.startsWith("data:") ? screenshotVideo.slice(0, 60) + "… (uploaded file)" : screenshotVideo}</p>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 text-sm font-semibold text-ink hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-white">
          Upload image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) prepImageFile(f, 1280, 1_000_000, (url) => { setScreenshots((cur) => [...cur, url]); setShotFileMsg(`Loaded ${f.name} — Save Media to apply.`); }, setShotFileMsg); }} />
        </label>
        <input value={newShot} onChange={(e) => setNewShot(e.target.value)} placeholder="…or paste preview image URL https://..." className="h-10 flex-1 rounded-xl border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
        <button onClick={addScreenshot} className="inline-flex h-10 items-center gap-1 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink">
          <Plus size={14} /> Add
        </button>
      </div>
      {shotFileMsg && <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{shotFileMsg}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {screenshots.map((url, idx) => (
          <div key={idx} className="relative overflow-hidden rounded-xl border border-ink/10 bg-white p-2 dark:border-white/10 dark:bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Preview ${idx + 2}`} className="h-32 w-full rounded-lg object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">#{idx + 2}</span>
            <button onClick={() => removeShot(idx)} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-red-600 shadow-md hover:bg-red-50 dark:bg-[#1a1a2e] dark:text-red-400">
              <Trash2 size={14} />
            </button>
            <p className="mt-2 truncate text-xs text-ink/60 dark:text-white/60">{url}</p>
          </div>
        ))}
        {screenshots.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-ink/40">No preview images yet. Add uploads or URLs above. Video will be #1 if set.</p>}
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
