"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { apps, type AppRecord } from "@/lib/data/apps";
import { useLanguage } from "@/components/shared/LanguageProvider";
type NewReleaseApp = AppRecord & { newReleaseImageUrl?: string | null; latestVersion?: string };

// Dynamic: shows latest apps (DB flagged isNewRelease + newest), admin can set image via /admin
export function NewReleases() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewReleaseApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/apps/new-releases", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.data) && data.data.length) {
            const mapped: NewReleaseApp[] = data.data.map((d: { id?: string; slug?: string; name: string; category: string; description?: string; icon?: string; accent?: string; downloads?: string; rating?: string; newReleaseImageUrl?: string; latestVersion?: string }) => ({
              id: d.slug || d.id || d.name.toLowerCase().replace(/\s+/g, "-"),
              name: d.name,
              category: d.category || "Development",
              description: d.description || "",
              longDescription: d.description || "",
              accent: d.accent || "#6C63FF",
              icon: d.icon || "✦",
              downloads: d.downloads || "—",
              rating: d.rating || "4.9",
              platforms: ["Android", "Windows", "Linux"],
              plans: [],
              newReleaseImageUrl: d.newReleaseImageUrl || null,
              latestVersion: d.latestVersion || null,
            }));
            setItems(mapped.slice(0, 3));
            setLoading(false);
            return;
          }
        }
      } catch {}
      // fallback to dummy in dev only — in production show empty to avoid mock leak
      if (active) {
        if (process.env.NODE_ENV === "production") {
          setItems([]);
        } else {
          const fallback = [...apps].sort((a, b) => {
            const da = a.versions?.[0]?.date || "";
            const db = b.versions?.[0]?.date || "";
            return db.localeCompare(da);
          }).slice(0, 3);
          setItems(fallback);
        }
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:from-primary/10 dark:via-[#1a1a2e] dark:to-secondary/10">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-lg">🚀</span>
        <div>
          <h3 className="text-lg font-bold text-ink dark:text-white">{t("newReleasesTitle")}</h3>
          <p className="text-xs text-ink/45 dark:text-white/40">{t("newReleasesDesc")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-ink/5 dark:bg-white/5" />)
        ) : items.map((app) => (
          <Link key={app.id} href={`/apps/${app.id}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
            {app.newReleaseImageUrl ? (
              <img src={app.newReleaseImageUrl} alt={app.name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-sm font-bold" style={{ backgroundColor: app.accent }}>{app.icon}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink dark:text-white group-hover:text-primary">{app.name}</p>
              <p className="flex items-center gap-2 truncate text-xs text-ink/45 dark:text-white/40">
                <Sparkles size={11} className="text-primary" /> {app.latestVersion ? `v${app.latestVersion}` : app.category}
              </p>
            </div>
            <ArrowRight size={14} className="shrink-0 text-ink/20 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <Link href="/apps" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 dark:bg-secondary dark:text-ink">
        {t("viewAllNew")} <ArrowRight size={14} />
      </Link>
    </section>
  );
}

// Helper for recent tracking — call on app card/detail click
export function trackRecentApp(id: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem("kwl-recent-apps") || "[]");
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    localStorage.setItem("kwl-recent-apps", JSON.stringify(next));
  } catch {}
}

export function NewReleasesHeroCard() {
  const { t } = useLanguage();
  const [app, setApp] = useState<NewReleaseApp | null>(null);
  useEffect(() => {
    fetch("/api/apps/new-releases", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.data) && d.data.length) setApp({ id: d.data[0].slug || d.data[0].id, name: d.data[0].name, category: d.data[0].category, description: "", longDescription: "", accent: "#6C63FF", icon: "🚀", downloads: "—", rating: "4.9", platforms: [], plans: [], newReleaseImageUrl: d.data[0].newReleaseImageUrl, latestVersion: d.data[0].latestVersion }); })
      .catch(() => {});
  }, []);
  return (
    <div className="absolute bottom-2 right-1 sm:bottom-5 sm:right-0 w-52 sm:w-56 -rotate-2 sm:-rotate-6 rounded-[1.5rem] border border-white/20 bg-white/90 p-4 sm:p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a2e]/80 transition duration-300 hover:-translate-y-3 hover:rotate-0 hover:shadow-2xl hover:shadow-primary/20 dark:hover:shadow-secondary/20 hover:z-20 cursor-pointer group/newrelease">
      <div className="mb-3 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ff6b6b]" />
        <span className="h-2 w-2 rounded-full bg-[#ffd166]" />
        <span className="h-2 w-2 rounded-full bg-[#06d6a0]" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/50">{t("newRelease")}</p>
      {app ? (
        <Link href={`/apps/${app.id}`} className="mt-2.5 flex items-center gap-3 rounded-xl bg-ink/[0.02] p-2 -m-2 hover:bg-ink/5 dark:hover:bg-white/5 transition group-hover/newrelease:bg-ink/[0.04]">
          {app.newReleaseImageUrl ? <img src={app.newReleaseImageUrl} alt={app.name} className="h-10 w-10 shrink-0 rounded-xl object-cover border border-ink/5 dark:border-white/10 transition group-hover/newrelease:scale-105" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white transition group-hover/newrelease:scale-105 group-hover/newrelease:bg-primary/90">🚀</span>}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-ink dark:text-white group-hover/newrelease:text-primary dark:group-hover/newrelease:text-secondary transition-colors">{app.name}</p>
            <p className="truncate text-xs text-ink/50 dark:text-white/50">{app.latestVersion ? `v${app.latestVersion}` : app.category}</p>
          </div>
        </Link>
      ) : (
        <p className="mt-2 text-sm font-semibold leading-6 text-ink dark:text-white break-words group-hover/newrelease:text-primary dark:group-hover/newrelease:text-secondary transition-colors">
          {t("lightweightTools")}
        </p>
      )}
    </div>
  );
}
