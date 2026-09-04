"use client";

import { Star } from "lucide-react";
import { useState, useMemo } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

// KWL-NEXUS API-তে ফিডব্যাক পাঠানোর জন্য wrapper
// ইউজার অ্যাপ পেজে <FeedbackForm appId={app.id} /> ব্যবহার করুন
// সাবমিট করলে POST /api/feedback → MongoDB → অ্যাডমিন GET /api/admin/feedbacks এ দেখাবে

const TYPE_KEYS = ["bug_report", "suggestion", "feature_request", "rating"] as const;

type Props = { appId: string };

export default function FeedbackForm({ appId }: Props) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ type: "suggestion", title: "", description: "", screenshot: "" });
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");

  const typeLabels: Record<string, string> = {
    bug_report: t("bugReport"),
    suggestion: t("suggestion"),
    feature_request: t("featureRequest"),
    rating: t("rating"),
  };

  const prompts = useMemo(() => ({
    bug_report: { title: t("feedbackBugTitle"), description: t("feedbackBugDesc"), guidance: t("feedbackBugGuidance") },
    suggestion: { title: t("feedbackSuggestionTitle"), description: t("feedbackSuggestionDesc"), guidance: t("feedbackSuggestionGuidance") },
    feature_request: { title: t("feedbackFeatureTitle"), description: t("feedbackFeatureDesc"), guidance: t("feedbackFeatureGuidance") },
    rating: { title: t("feedbackRatingTitle"), description: t("feedbackRatingDesc"), guidance: t("feedbackRatingGuidance") },
  }), [t]);

  const currentPrompt = prompts[form.type as keyof typeof prompts];

  async function readScreenshot(file: File | undefined) {
    if (!file) {
      setFileName("");
      setForm((c) => ({ ...c, screenshot: "" }));
      return;
    }
    if (file.size > 1_000_000) {
      setMessage(t("screenshotTooLarge"));
      setFileName("");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setForm((c) => ({ ...c, screenshot: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.type === "rating" && rating === 0) {
      setMessage(t("chooseRating"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, appId, ...(form.type === "rating" ? { rating } : {}) }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? t("feedbackError"));
      setMessage(t("feedbackSubmitted"));
      setForm({ type: "suggestion", title: "", description: "", screenshot: "" });
      setRating(0);
      setFileName("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("feedbackError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-[1.5rem] border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 shadow-sm">
      <h2 className="text-xl font-bold text-ink dark:text-white">{t("shareFeedback")}</h2>
      <p className="mt-2 text-sm text-ink/55 dark:text-white/60">{t("shareFeedbackDesc")}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {TYPE_KEYS.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => { setForm({ ...form, type: value }); setMessage(""); if (value !== "rating") setRating(0); }}
            className={`rounded-full px-3 py-2 text-xs font-semibold border transition ${form.type === value ? "bg-primary text-white border-primary dark:bg-primary" : "bg-paper dark:bg-white/10 text-ink/60 dark:text-white/60 border-ink/10 dark:border-white/10 hover:border-primary/20"}`}
          >
            {typeLabels[value]}
          </button>
        ))}
      </div>

      {form.type === "rating" && (
        <div className="mt-5" aria-label={t("chooseRating")}>
          <p className="text-sm font-semibold text-ink/60 dark:text-white/70">{t("yourRating")}</p>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value > 1 ? "s" : ""}`} className="rounded-md p-1 text-amber-400 transition hover:scale-110">
                <Star size={24} fill={value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
            <span className="ml-2 text-sm text-ink/50 dark:text-white/50">{rating ? `${rating}/5` : t("selectRating")}</span>
          </div>
        </div>
      )}

      <input
        required
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder={currentPrompt.title}
        className="mt-5 h-11 w-full rounded-xl border border-ink/10 dark:border-white/10 bg-paper dark:bg-white/10 px-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary"
      />
      <textarea
        required
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder={currentPrompt.description}
        rows={4}
        className="mt-3 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 dark:border-white/10 bg-paper dark:bg-white/10 p-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary"
      />
      <p className="mt-2 text-xs text-ink/45 dark:text-white/45">{currentPrompt.guidance}</p>

      <div className="mt-3">
        <p className="text-sm text-ink/55 dark:text-white/60">{t("screenshot")}</p>
        <div className="mt-2 flex items-center gap-3">
          <label className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition">
            {t("chooseFile")}
            <input type="file" accept="image/*" onChange={(e) => readScreenshot(e.target.files?.[0])} className="hidden" />
          </label>
          <span className="text-xs text-ink/45 dark:text-white/50 truncate">{fileName || t("noFileChosen")}</span>
          {fileName && (
            <button type="button" onClick={() => readScreenshot(undefined)} className="text-xs text-red-500 hover:underline">✕</button>
          )}
        </div>
      </div>

      <button disabled={loading} className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition disabled:opacity-60">
        {loading ? t("submitting") : t("submitFeedback")}
      </button>

      {message && <p className="mt-4 text-sm font-semibold text-[#159570] dark:text-emerald-400">{message}</p>}
    </form>
  );
}

// Named export for compatibility with app/(public)/apps/[id] already using shared version
export { FeedbackForm };
