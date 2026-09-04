"use client";

import { useState } from "react";
import { Image as ImageIcon, Loader2, Rocket, X } from "lucide-react";

export function NewReleaseEditor({ appId, initialImage, initialFlag }: { appId: string; initialImage?: string | null; initialFlag?: boolean }) {
  const [isNew, setIsNew] = useState(Boolean(initialFlag));
  const [imageUrl, setImageUrl] = useState(initialImage || "");
  const [preview, setPreview] = useState(initialImage || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { setMsg({ type: "error", text: "Image max 1MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base = reader.result as string;
      setImageUrl(base);
      setPreview(base);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/apps/${appId}/new-release`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNewRelease: isNew, newReleaseImageUrl: imageUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg({ type: "success", text: isNew ? "App marked as New Release" : "Removed from New Releases" });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
      <h3 className="flex items-center gap-2 font-bold text-ink dark:text-white"><Rocket size={18} className="text-primary"/> New Release</h3>
      <p className="mt-1 text-sm text-ink/50 dark:text-white/50">Show this app on homepage New Releases card. Add dashboard image here.</p>

      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-ink dark:text-white">
        <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="h-4 w-4 rounded border-ink/20 text-primary" />
        Show as New Release on homepage
      </label>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40">Dashboard image</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-paper px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <ImageIcon size={16} className="text-ink/40" />
            <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
          </label>
          {preview && <button onClick={() => { setPreview(""); setImageUrl(""); }} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"><X size={14}/> Remove</button>}
        </div>
        <input value={imageUrl.startsWith("data:") ? "" : imageUrl} onChange={(e) => { setImageUrl(e.target.value); setPreview(e.target.value); }} placeholder="Or paste image URL https://" className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
        {preview && <img src={preview} alt="preview" className="mt-3 max-h-32 rounded-xl border border-ink/10 object-cover dark:border-white/10" />}
        <p className="mt-2 text-xs text-ink/40 dark:text-white/30">Max 1MB. Recommended 400×400. Leave empty to use app icon.</p>
      </div>

      {msg && <p className={`mt-4 rounded-xl px-3 py-2 text-sm ${msg.type==="success"?"bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300":"bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"}`}>{msg.text}</p>}

      <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 dark:bg-secondary dark:text-ink">
        {saving ? <Loader2 size={16} className="animate-spin"/> : <Rocket size={16}/>} Save new release
      </button>
    </div>
  );
}
