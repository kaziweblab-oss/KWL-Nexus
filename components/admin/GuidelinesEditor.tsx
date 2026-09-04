"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, FileText } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function GuidelinesEditor() {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/update-guidelines");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("loadFailed"));
      setContent(json.data?.content ?? "");
      setUpdatedAt(json.data?.updatedAt ?? null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/update-guidelines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("saveFailed"));
      setMessage(t("guidelinesUpdated"));
      setUpdatedAt(json.data?.updatedAt ?? new Date().toISOString());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-10 text-center text-ink/50 dark:text-white/50">{t("loadingGuidelines")}</div>;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <FileText className="text-primary" size={20} />
        <div>
          <h2 className="font-bold text-ink dark:text-white">{t("guidelinesEditorTitle")}</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">{t("guidelinesEditorDesc")}</p>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("writeGuidelinesPlaceholder")}
        rows={4}
        className="mt-5 w-full resize-none rounded-xl border border-ink/10 bg-paper p-4 text-sm leading-6 text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-ink/40 dark:text-white/40">
          {updatedAt ? t("lastUpdated", { date: new Date(updatedAt).toLocaleString() }) : t("notSavedYet")} · {content.length}/10000
        </span>
        <span className="text-xs text-ink/40 dark:text-white/40">{t("apiLabelGuidelines")}</span>
      </div>

      <div className="mt-5 flex gap-3">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/90">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} {saving ? t("saving") : t("saveGuidelines")}
        </button>
        <button onClick={load} disabled={saving} className="rounded-full border border-ink/10 px-6 py-2.5 text-sm font-semibold text-ink/70 dark:border-white/10 dark:text-white/70 hover:bg-paper dark:hover:bg-white/10">
          {t("reload")}
        </button>
      </div>

      {message && <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm font-medium text-ink/70 dark:bg-white/5 dark:text-white/70">{message}</p>}

      <div className="mt-6 rounded-xl bg-[#f6f7fb] p-4 dark:bg-white/5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40">{t("previewLabel")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/70 dark:text-white/70">{content || t("noContentYet")}</p>
      </div>
    </div>
  );
}
