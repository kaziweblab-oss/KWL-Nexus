"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
type FeedbackItem = { status: string; appId?: { name?: string } };

// Analytics stays derived from the moderation feed until aggregation moves to MongoDB.
export function FeedbackAnalytics() {
  const { t } = useLanguage();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/admin/feedbacks");
        // Handle non-JSON / empty body (e.g. 204, 401 html, DB offline) safely
        const text = await response.text();
        const result = text ? (JSON.parse(text) as { data?: FeedbackItem[]; error?: string }) : {};
        if (!response.ok) throw new Error(result.error ?? `Failed to load analytics (${response.status})`);
        if (!cancelled) setItems(result.data ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load analytics");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const byApp = useMemo(() => Object.entries(items.reduce<Record<string, number>>((result, item) => { const name = item.appId?.name ?? "Unknown app"; result[name] = (result[name] ?? 0) + 1; return result; }, {})), [items]);
  if (error) return <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-white/5 dark:bg-amber-950/20"><h2 className="font-bold text-ink dark:text-white">{t("feedbackAnalytics")}</h2><p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{error}</p><p className="mt-1 text-xs text-ink/40 dark:text-white/40">Check admin login and MongoDB connection, then refresh.</p></section>;
  return <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/5 dark:bg-[#1d1d34]"><div className="flex items-center justify-between"><h2 className="font-bold text-ink dark:text-white">{t("feedbackAnalytics")}</h2><span className="text-xs uppercase tracking-widest text-ink/35 dark:text-white/35">{t("appWiseReport")}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-paper p-4 dark:bg-white/5"><p className="text-2xl font-bold text-ink dark:text-white">{items.length}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/45">{t("totalFeedback")}</p></div><div className="rounded-xl bg-paper p-4 dark:bg-white/5"><p className="text-2xl font-bold text-primary dark:text-secondary">{items.filter((item) => item.status === "pending").length}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/45">{t("pendingReview")}</p></div><div className="rounded-xl bg-paper p-4 dark:bg-white/5"><p className="text-2xl font-bold text-[#159570] dark:text-emerald-400">{items.filter((item) => item.status === "resolved").length}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/45">{t("resolved")}</p></div></div><div className="mt-5 space-y-3">{byApp.map(([name, count]) => <div key={name} className="flex items-center justify-between border-b border-ink/10 pb-3 text-sm dark:border-white/5"><span className="font-semibold text-ink dark:text-white">{name}</span><span className="text-ink/50 dark:text-white/50">{count} {t("reports")}</span></div>)}</div></section>;
}
