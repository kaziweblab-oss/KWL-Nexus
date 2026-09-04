"use client";

import Link from "next/link";
import { ArrowRight, Play, Shield, RefreshCw, Users, Download, Star, Monitor, Smartphone, Laptop, Gamepad2, MessageCircle, Code2, Bot } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type HomeApp = { id: string; slug: string; name: string; category: string; description: string; accent: string; icon: string; iconUrl?: string | null; downloads?: string; downloadCount?: number; rating?: string; platforms: string[]; latestVersion?: string | null; newReleaseImageUrl?: string | null };

export default function Home() {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const [popularApps, setPopularApps] = useState<HomeApp[]>([]);
  const [latestApps, setLatestApps] = useState<HomeApp[]>([]);

  useEffect(() => {
    fetch("/api/apps/popular", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (Array.isArray(j.data)) setPopularApps(j.data.slice(0, 4).map((a: HomeApp) => ({ ...a, platforms: (a as unknown as { platforms?: string[] }).platforms ?? ["Windows"], accent: (a as unknown as { accent?: string }).accent ?? "#6C63FF", icon: a.name.slice(0,1).toUpperCase(), rating: (a as unknown as { rating?: string }).rating ?? "4.9", downloads: (a as unknown as { downloads?: string }).downloads ?? String(a.downloadCount ?? 0) }))); }).catch(() => setPopularApps([]));
    fetch("/api/apps/new-releases", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (Array.isArray(j.data)) setLatestApps(j.data.slice(0, 4).map((a: HomeApp) => ({ ...a, platforms: (a as unknown as { platforms?: string[] }).platforms ?? ["Windows"], accent: "#6C63FF", icon: a.name.slice(0,1).toUpperCase(), rating: (a as unknown as { rating?: string }).rating ?? "4.9", downloads: (a as unknown as { downloads?: string }).downloads ?? "—" }))); }).catch(() => setLatestApps([]));
  }, []);

  const platformIcons: Record<string, typeof Monitor> = {
    Android: Smartphone,
    Windows: Monitor,
    Linux: Laptop,
  };

  return (
    <main className="overflow-hidden bg-white dark:bg-[#0f0f1e]">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Content */}
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 dark:border-white/10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-white/5 dark:to-white/5 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <span className="text-base">✨</span> {t("heroBadge")}
            </div>

            <h1 className="text-4xl font-bold leading-[1.45] tracking-tight text-[#0f0f1e] dark:text-white sm:text-5xl sm:leading-[1.35] lg:text-6xl lg:leading-[1.25]">
              {t("heroTitle1")}
              <br />
              <span className="bg-gradient-to-r from-[#6C63FF] to-[#00D4FF] bg-clip-text text-transparent">
                {t("heroTitle2")}
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-white/60">
              {t("heroDesc")}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/apps"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#7C3AED] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6C63FF]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#6C63FF]/40"
              >
                {t("browseApps")} <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/tutorial"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-transparent px-7 py-3.5 text-sm font-semibold text-slate-700 dark:text-white transition hover:border-[#6C63FF]/30 hover:text-[#6C63FF] dark:hover:text-[#00D4FF] hover:shadow-md"
              >
                <Play size={16} fill="currentColor" /> {t("forDevelopers")}
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex flex-wrap gap-6">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-green-100 dark:bg-green-500/20">
                  <Shield size={14} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{t("trustSecure")}</p>
                  <p className="text-[10px] text-slate-500 dark:text-white/50">{t("trustSecureDesc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 dark:bg-blue-500/20">
                  <RefreshCw size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{t("trustUpdates")}</p>
                  <p className="text-[10px] text-slate-500 dark:text-white/50">{t("trustUpdatesDesc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-purple-100 dark:bg-purple-500/20">
                  <Users size={14} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{t("trustCommunity")}</p>
                  <p className="text-[10px] text-slate-500 dark:text-white/50">{t("trustCommunityDesc")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Illustration - Laptop Mockup */}
          <div className="relative hidden lg:block">
            {/* Background glow */}
            <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-[#6C63FF]/20 via-[#00D4FF]/10 to-transparent blur-3xl dark:from-[#6C63FF]/30 dark:via-[#00D4FF]/20" />

            {/* Cursive text */}
            <div className="absolute -right-8 -top-8 z-20 rotate-6 font-[cursive] text-base italic text-[#6C63FF]/70 dark:text-[#00D4FF]/70">
              {t("cursiveText")}
            </div>

            {/* Laptop shape */}
            <div className="relative mx-auto w-[340px]">
              {/* Screen */}
              <div className="relative overflow-hidden rounded-t-2xl border-2 border-b-0 border-slate-200 dark:border-white/10 bg-gradient-to-br from-[#f8f9ff] to-[#eef1ff] dark:from-[#1a1a2e] dark:to-[#0f0f1e] shadow-2xl">
                {/* Screen content - KWL NEXUS branding */}
                <div className="flex h-[220px] flex-col items-center justify-center gap-3 p-6">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-xl shadow-[#6C63FF]/25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={isDark ? "/branding/icons/kwl-nexus-icon-dark.png" : "/branding/icons/kwl-nexus-icon-white.png"} alt="KWL Nexus" className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-transparent" />
                  </div>
                  <p className="text-lg font-bold tracking-tight text-[#0f0f1e] dark:text-white">KWL-NEXUS</p>
                  <p className="text-center text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/50">Where Innovation Meets Connection</p>
                  <div className="mt-2 flex gap-2">
                    <div className="h-2 w-12 rounded-full bg-[#6C63FF]/30" />
                    <div className="h-2 w-8 rounded-full bg-[#00D4FF]/30" />
                    <div className="h-2 w-10 rounded-full bg-[#6C63FF]/20" />
                  </div>
                </div>
              </div>
              {/* Laptop base */}
              <div className="h-4 rounded-b-2xl bg-gradient-to-b from-slate-200 to-slate-300 dark:from-white/10 dark:to-white/5 shadow-lg" />
              <div className="mx-auto h-2 w-32 rounded-b-lg bg-slate-300 dark:bg-white/10" />
            </div>

            {/* Floating icons */}
            <div className="absolute left-[-20px] top-[60px] z-10 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#4752C4] text-white shadow-lg dark:shadow-[#5865F2]/30 animate-[float_3s_ease-in-out_infinite]">
              <Gamepad2 size={22} />
            </div>
            <div className="absolute bottom-[80px] left-[-10px] z-10 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#5865F2] to-[#EB459E] text-white shadow-lg dark:shadow-[#EB459E]/30 animate-[float_3.5s_ease-in-out_infinite_0.5s]">
              <MessageCircle size={18} />
            </div>
            <div className="absolute bottom-[40px] right-[-10px] z-10 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#3DDC84] to-[#2DB84D] text-white shadow-lg dark:shadow-[#3DDC84]/30 animate-[float_4s_ease-in-out_infinite_1s]">
              <Bot size={18} />
            </div>
            <div className="absolute right-[20px] top-[40px] z-10 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#61DAFB] to-[#21A1C9] text-white shadow-lg dark:shadow-[#61DAFB]/30 animate-[float_3.2s_ease-in-out_infinite_0.3s]">
              <Code2 size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-100 dark:border-white/10 bg-gradient-to-r from-slate-50/50 dark:from-white/[0.02] to-white dark:to-transparent">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-10 sm:grid-cols-4 lg:px-8">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 shadow-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 dark:bg-blue-500/20">
              <Bot size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f0f1e] dark:text-white">100+</p>
              <p className="text-xs font-medium text-slate-500 dark:text-white/50">{t("statsApps")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 shadow-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-100 dark:bg-purple-500/20">
              <Download size={22} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f0f1e] dark:text-white">50K+</p>
              <p className="text-xs font-medium text-slate-500 dark:text-white/50">{t("statsDownloads")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 shadow-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 dark:bg-blue-500/20">
              <Users size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f0f1e] dark:text-white">10K+</p>
              <p className="text-xs font-medium text-slate-500 dark:text-white/50">{t("statsUsers")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 shadow-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
              <Star size={22} className="text-orange-500 dark:text-orange-400" fill="currentColor" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f0f1e] dark:text-white">4.9/5</p>
              <p className="text-xs font-medium text-slate-500 dark:text-white/50">{t("statsRating")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular Apps */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0f0f1e] dark:text-white">
              <span className="mr-2">🔥</span> {t("mostPopularApps")}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-white/50">{t("mostPopularDesc")}</p>
          </div>
          <Link href="/apps" className="hidden items-center gap-1 text-sm font-semibold text-[#6C63FF] dark:text-[#00D4FF] hover:underline sm:flex">
            {t("viewAllApps")} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popularApps.length === 0 ? (
            <p className="col-span-4 py-10 text-center text-sm text-slate-500 dark:text-white/50">{t("noAppsMatch")}</p>
          ) : popularApps.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.slug || app.id}`}
              className="group flex flex-col rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#6C63FF]/20 hover:shadow-lg hover:shadow-[#6C63FF]/5 dark:hover:shadow-[#6C63FF]/10"
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl text-xl text-white shadow-md"
                  style={{ backgroundColor: app.accent }}
                >
                  {app.iconUrl ? <img src={app.iconUrl} alt={app.name} className="h-full w-full object-cover" /> : app.icon}
                </div>
                <button className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 dark:text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white">
                  <span className="text-lg leading-none">⋮</span>
                </button>
              </div>
              <h3 className="font-bold text-[#0f0f1e] dark:text-white">{app.name}</h3>
              <p className="text-xs text-slate-500 dark:text-white/50">{app.category}</p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <Star size={12} className="text-amber-500" fill="currentColor" />
                <span className="font-semibold text-[#0f0f1e] dark:text-white">{app.rating}</span>
                <span className="text-slate-400 dark:text-white/40">({app.downloads})</span>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-white/60 line-clamp-2">{app.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6C63FF]/10 dark:bg-[#6C63FF]/20 px-3.5 py-1.5 text-xs font-semibold text-[#6C63FF] dark:text-[#00D4FF] transition group-hover:bg-[#6C63FF] group-hover:text-white">
                  <Download size={12} /> {t("download")}
                </span>
                <div className="flex items-center gap-1 text-slate-400 dark:text-white/40">
                  {app.platforms.map((p) => {
                    const Icon = platformIcons[p];
                    return Icon ? <Icon key={p} size={14} /> : null;
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Releases */}
      <section className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0f0f1e] dark:text-white">
              <span className="mr-2">🚀</span> {t("latestReleases")}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-white/50">{t("latestReleasesDesc")}</p>
          </div>
          <Link href="/apps" className="hidden items-center gap-1 text-sm font-semibold text-[#6C63FF] dark:text-[#00D4FF] hover:underline sm:flex">
            {t("viewAllReleases")} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {latestApps.length === 0 ? (
            <p className="col-span-4 py-10 text-center text-sm text-slate-500 dark:text-white/50">{t("noAppsMatch")}</p>
          ) : latestApps.map((app, idx) => {
            const v = (app as unknown as { latestVersion?: string; versions?: { version: string; date: string }[] }).latestVersion ?? (app as unknown as { versions?: { version: string; date: string }[] }).versions?.[0]?.version;
            const d = (app as unknown as { versions?: { version: string; date: string }[] }).versions?.[0]?.date ?? "";
            const isBeta = idx === 3;
            return (
              <Link
                key={app.id}
                href={`/apps/${app.slug || app.id}`}
                className="group flex flex-col rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#6C63FF]/20 hover:shadow-lg hover:shadow-[#6C63FF]/5 dark:hover:shadow-[#6C63FF]/10"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl text-xl text-white shadow-md"
                    style={{ backgroundColor: app.accent }}
                  >
                    {app.iconUrl ? <img src={app.iconUrl} alt={app.name} className="h-full w-full object-cover" /> : app.icon}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isBeta ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" : "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"}`}>
                    {isBeta ? t("betaBadge") : t("newBadge")}
                  </span>
                </div>
                <h3 className="font-bold text-[#0f0f1e] dark:text-white">{app.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-white/50">
                  {v ? `v${v}` : "v1.0.0"}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-white/60 line-clamp-2">{app.description}</p>
                <p className="mt-3 text-xs text-slate-400 dark:text-white/40">
                  📅 {d || "—"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f0f4ff] via-[#f8f9ff] to-[#e8f4ff] dark:from-[#1a1a2e] dark:via-[#0f0f1e] dark:to-[#1a1a2e] p-10 sm:p-14">
          {/* Decorative elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#6C63FF]/10 dark:bg-[#6C63FF]/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#00D4FF]/10 dark:bg-[#00D4FF]/20 blur-3xl" />

          <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[#0f0f1e] dark:text-white sm:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="mt-3 max-w-md text-slate-600 dark:text-white/60">
                {t("ctaDesc")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {!session && (
                  <Link
                    href="/login?mode=signup"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6C63FF]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {t("createAccount")}
                  </Link>
                )}
                <Link
                  href="/apps"
                  className={session
                    ? "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6C63FF]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
                    : "inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-transparent px-6 py-3 text-sm font-semibold text-slate-700 dark:text-white transition hover:border-[#6C63FF]/30 hover:text-[#6C63FF] dark:hover:text-[#00D4FF] hover:shadow-md"}
                >
                  {t("browseAllApps")}
                </Link>
              </div>
            </div>

            {/* Decorative illustration */}
            <div className="relative hidden sm:block">
              <div className="flex flex-col items-end gap-2 font-[cursive] text-2xl italic">
                <span className="text-[#6C63FF]/60">Build</span>
                <span className="text-[#00D4FF]/60">Download</span>
                <span className="text-[#6C63FF]/60">Create</span>
                <span className="text-[#00D4FF]/60">Together</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isDark ? "/branding/icons/kwl-nexus-icon-dark.png" : "/branding/icons/kwl-nexus-icon-white.png"}
                alt="KWL Nexus"
                className="absolute -left-10 bottom-0 h-20 w-20 rounded-3xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  );
}
