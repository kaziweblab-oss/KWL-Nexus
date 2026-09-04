"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { apps, type AppRecord } from "@/lib/data/apps";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Recently viewed — up to 3, better empty state, smooth hover
export function RecentApps() {
  const { t } = useLanguage();
  const [recent, setRecent] = useState<AppRecord[]>([]);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem("kwl-recent-apps") || "[]");
      const found = ids.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as AppRecord[];
      setRecent(found.slice(0, 3));
    } catch {
      setRecent([]);
    }
  }, []);

  const display = recent.length ? recent : apps.filter((a) => a.featured).slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-[#1a1a2e]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg">🌟</span>
        <div>
          <h3 className="text-lg font-bold text-ink dark:text-white">{t("nextFavWorkflow")}</h3>
          <p className="text-xs text-ink/45 dark:text-white/40">{t("recentAppsDesc")}</p>
        </div>
      </div>

      {recent.length === 0 && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{t("emptyRecent")}</p>}

      <div className="mt-5 grid gap-4">
        {display.map((app) => (
          <Link key={app.id} href={`/apps/${app.id}`} onClick={() => {
            try {
              const prev: string[] = JSON.parse(localStorage.getItem("kwl-recent-apps") || "[]");
              const next = [app.id, ...prev.filter((x) => x !== app.id)].slice(0, 10);
              localStorage.setItem("kwl-recent-apps", JSON.stringify(next));
            } catch {}
          }} className="group flex items-center gap-3 rounded-xl border border-ink/5 bg-paper/50 p-3 transition hover:border-primary/20 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-sm font-bold" style={{ backgroundColor: app.accent }}>{app.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink dark:text-white group-hover:text-primary">{app.name}</p>
              <p className="truncate text-xs text-ink/45 dark:text-white/40">{app.category} • {app.downloads} downloads</p>
            </div>
            <ArrowRight size={14} className="shrink-0 text-ink/20 group-hover:text-primary dark:text-white/20" />
          </Link>
        ))}
      </div>

      <Link href="/apps" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary dark:bg-white dark:text-ink dark:hover:bg-secondary">
        {t("viewAll")} <ArrowRight size={14} />
      </Link>
    </section>
  );
}
