"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Activity = { id: string; text: string; time: string };

export function RecentActivity() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/recent-activity", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled && Array.isArray(j.data) && j.data.length) setItems(j.data);
        else if (!cancelled) {
          // fallback to empty -> will show placeholder, not static mock
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink dark:text-white">{t("recentActivity")}</h2>
          <span className="text-xs uppercase tracking-widest text-ink/35 dark:text-white/35">{t("liveFeed")}</span>
        </div>
        <div className="mt-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <span className="mt-1 h-2 w-2 rounded-full bg-ink/10 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-ink/10 dark:bg-white/10" />
                <div className="h-2 w-1/3 rounded bg-ink/10 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink dark:text-white">{t("recentActivity")}</h2>
          <span className="text-xs uppercase tracking-widest text-ink/35 dark:text-white/35">{t("liveFeed")}</span>
        </div>
        <p className="mt-6 text-sm text-ink/50 dark:text-white/50">{t("noRecentActivity")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink dark:text-white">{t("recentActivity")}</h2>
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-ink/35 dark:text-white/35">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {t("liveFeed")}
        </span>
      </div>
      {items.length > 0 && (
        <div className="mt-3 flex justify-end">
          <button onClick={() => setItems([])} className="text-xs font-semibold text-ink/40 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400">{t("clear")}</button>
        </div>
      )}
      <div className="mt-6 space-y-5">
        {items.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary dark:bg-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-ink dark:text-white">{a.text}</p>
              <p className="mt-1 text-xs text-ink/40 dark:text-white/40">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
