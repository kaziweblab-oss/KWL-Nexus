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
  const [form, setForm] = useState({ type: "suggestion", title: "", description: "", screenshot: "", link: "" });
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "">("");
  const [fileName, setFileName] = useState("");
  const [touched, setTouched] = useState(false);

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

  // Field-wise validation (replaces cryptic "Invalid feedback" + native bubbles).
  const titleError = form.title.trim().length === 0 ? "" : form.title.trim().length < 3 ? t("feedbackTitleShort") : "";
  const descError = form.description.trim().length === 0 ? "" : form.description.trim().length < 5 ? t("feedbackDescShort") : "";
  const needsEvidence = form.type === "bug_report";
  const hasEvidence = form.screenshot.trim().length > 0 || form.link.trim().length > 0;
  const canSubmit =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 5 &&
    (!needsEvidence || hasEvidence) &&
    (form.type !== "rating" || rating > 0) &&
    !loading;

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
    setTouched(true);
    if (form.type === "rating" && rating === 0) {
      setMessage(t("chooseRating"));
      setMessageKind("error");
      return;
    }
    if (!canSubmit || loading) return;
    setLoading(true);
    setMessage("");
    setMessageKind("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, appId, link: form.link.trim() || undefined, ...(form.type === "rating" ? { rating } : {}) }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? t("feedbackError"));
      setMessage(t("feedbackSubmitted"));
      setMessageKind("success");
      setForm({ type: "suggestion", title: "", description: "", screenshot: "", link: "" });
      setRating(0);
      setFileName("");
      setTouched(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("feedbackError"));
      setMessageKind("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mb-10 mt-8 rounded-[1.5rem] border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 shadow-sm">
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
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder={currentPrompt.title}
        aria-invalid={Boolean(touched && titleError)}
        className={`mt-5 h-11 w-full rounded-xl border bg-paper dark:bg-white/10 px-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary ${touched && titleError ? "border-red-400 focus:ring-2 focus:ring-red-400/20" : "border-ink/10 dark:border-white/10"}`}
      />
      {touched && titleError && <p className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400">{titleError}</p>}
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder={currentPrompt.description}
        rows={4}
        aria-invalid={Boolean(touched && descError)}
        className={`mt-3 min-h-[112px] h-28 w-full resize-none rounded-xl border bg-paper dark:bg-white/10 p-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary ${touched && descError ? "border-red-400 focus:ring-2 focus:ring-red-400/20" : "border-ink/10 dark:border-white/10"}`}
      />
      {touched && descError && <p className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400">{descError}</p>}
      <p className="mt-2 text-xs text-ink/45 dark:text-white/45">{currentPrompt.guidance}</p>

      {needsEvidence && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${hasEvidence ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
          {t("feedbackEvidenceHint")}
        </p>
      )}
      <input
        value={form.link}
        onChange={(e) => setForm({ ...form, link: e.target.value })}
        placeholder={t("feedbackLinkPlaceholder")}
        inputMode="url"
        className="mt-3 h-11 w-full rounded-xl border border-ink/10 dark:border-white/10 bg-paper dark:bg-white/10 px-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary"
      />

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

      <button disabled={!canSubmit} title={!canSubmit && needsEvidence && !hasEvidence ? t("feedbackEvidenceHint") : undefined} className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-40">
        {loading ? t("submitting") : t("submitFeedback")}
      </button>

      {message && <p className={`mt-4 text-sm font-semibold ${messageKind === "error" ? "text-red-500 dark:text-red-400" : "text-[#159570] dark:text-emerald-400"}`}>{message}</p>}
    </form>
  );
}

// Named export for compatibility with app/(public)/apps/[id] already using shared version
export { FeedbackForm };
