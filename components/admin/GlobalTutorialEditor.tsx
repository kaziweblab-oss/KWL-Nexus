"use client";

import { useEffect, useState } from "react";
import { Save, Eye, ExternalLink, Play, Upload, Link2, X } from "lucide-react";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Form = {
  tutorialVideoUrl: string;
  tutorialVideoType: "youtube" | "vimeo" | "custom";
  tutorialTitle: string;
  tutorialDescription: string;
  tutorialIsActive: boolean;
};

export function GlobalTutorialEditor() {
  const { t } = useLanguage();
  const [form, setForm] = useState<Form>({
    tutorialVideoUrl: "",
    tutorialVideoType: "youtube",
    tutorialTitle: "How to use KWL Nexus Apps",
    tutorialDescription: "Watch this quick guide to learn how to browse, download and use our apps.",
    tutorialIsActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/system-config")
      .then((r) => r.json())
      .then((j) => {
        const d = j.data ?? {};
        setForm({
          tutorialVideoUrl: d.tutorialVideoUrl ?? "",
          tutorialVideoType: (d.tutorialVideoType as Form["tutorialVideoType"]) ?? "youtube",
          tutorialTitle: d.tutorialTitle ?? "How to use KWL Nexus Apps",
          tutorialDescription: d.tutorialDescription ?? "Watch this quick guide to learn how to browse, download and use our apps.",
          tutorialIsActive: d.tutorialIsActive ?? true,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setMsg({ type: "success", text: "Tutorial video saved. Hero button → /tutorial will show new video instantly. No code refactor needed." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  // helper for custom video upload → base64 data-url (stored in DB, no refactor needed)
  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50_000_000) { setMsg({ type: "error", text: "Video max 50MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base = reader.result as string;
      setForm((cur) => ({ ...cur, tutorialVideoUrl: base }));
      setMsg({ type: "success", text: `Loaded ${file.name} — save korle /tutorial e dekhabe` });
    };
    reader.readAsDataURL(file);
  }

  if (loading) return <p className="py-6 text-sm text-ink/40 dark:text-white/40">{t("loading")}</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={save} className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
        <h3 className="flex items-center gap-2 font-bold text-ink dark:text-white"><Play size={16} className="text-primary" /> {t("globalTutorialVideo")}</h3>
        <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{t("globalTutorialDescAdmin")}</p>

        {/* 1. Video type upore */}
        <label className="mt-5 block text-sm font-semibold text-ink/60 dark:text-white/60">
          {t("videoTypeLabel")}
          <div className="mt-2">
            <CustomSelect
              value={form.tutorialVideoType}
              options={[{ value: "youtube", label: "YouTube" }, { value: "vimeo", label: "Vimeo" }, { value: "custom", label: "Custom video (mp4)" }]}
              onChange={(v) => setForm({ ...form, tutorialVideoType: v as Form["tutorialVideoType"] })}
            />
          </div>
          <p className="mt-1.5 text-xs font-normal text-ink/40 dark:text-white/40">
            {form.tutorialVideoType === "youtube" && "YouTube link dile embed hoye /tutorial e dekhabe"}
            {form.tutorialVideoType === "vimeo" && "Vimeo link dile player e dekhabe"}
            {form.tutorialVideoType === "custom" && "MP4 upload ba direct .mp4 link — server code change lage na"}
          </p>
        </label>

        {/* 2. Niche conditional: youtube/vimeo → URL, custom → upload + URL */}
        {form.tutorialVideoType === "custom" ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink/60 dark:text-white/60 flex items-center gap-1.5"><Upload size={14} /> Upload video</p>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 bg-paper px-4 py-6 text-sm font-medium text-ink/60 hover:border-primary/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20 dark:hover:bg-white/10 transition">
                <Upload size={16} /> Choose video file (mp4, webm, max 50MB)
                <input type="file" accept="video/*,.mp4,.webm,.ogg" className="hidden" onChange={handleVideoFile} />
              </label>
              {form.tutorialVideoUrl.startsWith("data:video") && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="truncate">✓ Video loaded (base64) — Save korlei live</span>
                  <button type="button" onClick={() => setForm((c) => ({ ...c, tutorialVideoUrl: "" }))} className="ml-2 grid h-6 w-6 place-items-center rounded-full bg-white text-red-500 hover:bg-red-50 dark:bg-white/10 dark:text-red-300"><X size={12} /></button>
                </div>
              )}
            </div>
            <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">
              <span className="flex items-center gap-1.5"><Link2 size={12} /> Or paste MP4 URL</span>
              <input
                type="url"
                value={form.tutorialVideoUrl.startsWith("data:") ? "" : form.tutorialVideoUrl}
                onChange={(e) => setForm({ ...form, tutorialVideoUrl: e.target.value })}
                placeholder="https://example.com/video.mp4"
                className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>
          </div>
        ) : (
          <label className="mt-4 block text-sm font-semibold text-ink/60 dark:text-white/60">
            <span className="flex items-center gap-1.5"><Link2 size={12} /> Video URL</span>
            <input
              type="url"
              value={form.tutorialVideoUrl}
              onChange={(e) => setForm({ ...form, tutorialVideoUrl: e.target.value })}
              placeholder={form.tutorialVideoType === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://vimeo.com/..."}
              className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>
        )}

        <label className="mt-4 block text-sm font-semibold text-ink/60 dark:text-white/60">
          {t("titleLabelAdmin")}
          <input
            value={form.tutorialTitle}
            onChange={(e) => setForm({ ...form, tutorialTitle: e.target.value })}
            className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-ink/60 dark:text-white/60">
          {t("descriptionLabelAdmin")}
          <textarea
            value={form.tutorialDescription}
            onChange={(e) => setForm({ ...form, tutorialDescription: e.target.value })}
            className="mt-2 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 bg-paper p-4 text-sm leading-relaxed text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            rows={4}
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink/60 dark:text-white/60">
          <input type="checkbox" checked={form.tutorialIsActive} onChange={(e) => setForm({ ...form, tutorialIsActive: e.target.checked })} className="h-4 w-4 rounded border-ink/20 text-primary" />
          {t("showVideoOnTutorial")}
        </label>

        <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
          <Save size={15} /> {saving ? t("saving") : t("saveVideo")}
        </button>
        {msg && <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"}`}>{msg.text}</p>}

        <p className="mt-4 text-xs text-ink/40 dark:text-white/30">Tip: Change YouTube link here → visitors at <a href="/tutorial" className="font-semibold text-primary underline">/tutorial</a> see new video instantly. No deploy / code change needed beyond DB update.</p>
      </form>

      <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-ink dark:text-white"><Eye size={14} className="text-primary" /> {t("livePreview")}</p>
          {form.tutorialVideoUrl && <a href="/tutorial" target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{t("openTutorial")} <ExternalLink size={11} /></a>}
        </div>
        <div className="mt-4">
          {form.tutorialVideoUrl ? <VideoPlayer url={form.tutorialVideoUrl} type={form.tutorialVideoType} /> : <div className="grid aspect-video place-items-center rounded-2xl bg-paper text-sm text-ink/40 dark:bg-white/5 dark:text-white/40">{form.tutorialVideoType === "custom" ? "Upload video or paste .mp4 URL to preview" : `Paste ${form.tutorialVideoType} URL above to preview`}</div>}
        </div>
        <div className="mt-4 rounded-xl bg-paper p-4 dark:bg-white/5">
          <p className="text-sm font-bold text-ink dark:text-white">{form.tutorialTitle}</p>
          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{form.tutorialDescription}</p>
        </div>
      </section>
    </div>
  );
}
