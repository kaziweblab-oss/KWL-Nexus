"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Download, Star } from "lucide-react";
import { apps as dummyApps, type AppRecord } from "@/lib/data/apps";
import { useLanguage } from "@/components/shared/LanguageProvider";

type PopularApp = AppRecord & { downloadCount?: number; iconUrl?: string | null };

export function PopularMarquee() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<PopularApp[]>([]);
  const isBn = lang === "bn";

  useEffect(() => {
    const isProd = process.env.NODE_ENV === "production";
    fetch("/api/apps/popular", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.data) && d.data.length) {
          const mapped: PopularApp[] = d.data.map((a: Record<string, unknown>) => ({
            id: (a.slug as string) || (a.id as string) || (a.name as string).toLowerCase().replace(/\s+/g, "-"),
            name: a.name as string,
            category: (a.category as string) || "Development",
            description: (a.description as string) || "",
            longDescription: (a.description as string) || "",
            accent: (a.accent as string) || "#6C63FF",
            icon: (a.icon as string) || (a.name as string).slice(0, 1).toUpperCase(),
            iconUrl: (a.iconUrl as string) || null,
            downloads: (a.downloads as string) || (a.downloadCount ? `${a.downloadCount}` : "—"),
            downloadCount: (a.downloadCount as number) ?? 0,
            rating: (a.rating as string) || "4.9",
            platforms: ["Android", "Windows", "Linux"],
            plans: [],
          }));
          setItems(mapped);
          return;
        }
        if (isProd) setItems([]);
        else setItems(dummyApps.slice(0, 10));
      })
      .catch(() => {
        const isProd = process.env.NODE_ENV === "production";
        if (isProd) setItems([]);
        else setItems(dummyApps.slice(0, 10));
      });
  }, []);

  const display: PopularApp[] = items;
  // Duplicate for seamless infinite scroll
  const track: PopularApp[] = [...display, ...display];

  if (!display.length) return null;

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-gradient-to-r from-indigo-50 via-slate-50 to-cyan-50 dark:border-white/10 dark:from-white/[0.03] dark:via-[#1a1a2e]/50 dark:to-white/[0.02] py-8">
      <div className="mx-auto max-w-6xl px-6 lg:px-8 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-sm">
            <TrendingUp size={14} />
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              {t("popularNow")}
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-white/40">{t("popularDesc")}</p>
          </div>
        </div>
        <Link href="/apps" className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 dark:text-secondary hover:underline">
          {isBn ? "সব দেখুন" : "View all"} <Download size={12} />
        </Link>
      </div>

      {/* Marquee track */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused] will-change-transform">
          {track.map((app, idx) => (
            <Link
              key={`${app.id}-${idx}`}
              href={`/apps/${app.id}`}
              className="group flex min-w-[240px] max-w-[240px] min-h-[138px] flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 shrink-0"
            >
              <div className="flex items-center gap-3">
                {app.iconUrl ? (
                  <img src={app.iconUrl} alt={app.name} className="h-11 w-11 shrink-0 rounded-xl object-cover border border-slate-200 dark:border-white/10" />
                ) : (
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white text-sm font-bold shadow-sm"
                    style={{ backgroundColor: app.accent }}
                  >
                    {app.icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-primary dark:text-white dark:group-hover:text-primary">{app.name}</p>
                  <p className="truncate text-xs font-medium text-slate-500 dark:text-white/50">{app.category}</p>
                </div>
                <span className="h-6 w-6 grid place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60 group-hover:bg-primary group-hover:text-white transition shrink-0">
                  <TrendingUp size={12} />
                </span>
              </div>
              <p className="line-clamp-1 text-xs leading-5 text-slate-600 dark:text-white/60">{app.description}</p>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-white/50">
                <span className="flex items-center gap-1 text-amber-600 dark:text-[#d69b12]">
                  <Star size={12} fill="currentColor" /> {app.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download size={11} /> {app.downloadCount && app.downloadCount > 0 ? `${app.downloadCount}` : app.downloads}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
