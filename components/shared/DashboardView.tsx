"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { Clock3, Download, Package, ReceiptText, UserRound } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogoutIcon } from "@/components/ui/LogoutIcon";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function DashboardView() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const [imgError, setImgError] = useState(false);
  const [stats, setStats] = useState<{ downloads: number; subscriptions: number; totalSpent: number; currency: string } | null>(null);
  const [myApps, setMyApps] = useState<{ appId: string; appName: string; planName: string; accent: string; icon: string }[]>([]);
  const [recent, setRecent] = useState<{ id: string; title: string; time: string }[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // real state — fetch subscriptions & payments
  useEffect(() => {
    if (!session?.user?.email) { setStatsLoading(false); return; }
    let cancelled = false;
    async function load() {
      setStatsLoading(true);
      try {
        const [subRes, payRes] = await Promise.all([
          fetch("/api/user/subscriptions", { cache: "no-store" }),
          fetch("/api/payment/history", { cache: "no-store" }),
        ]);
        const subJson = subRes.ok ? await subRes.json().catch(() => ({})) : {};
        const payJson = payRes.ok ? await payRes.json().catch(() => ({})) : {};
        const subs: any[] = Array.isArray(subJson.data) ? subJson.data : Array.isArray(subJson.subscriptions) ? subJson.subscriptions : [];
        const pays: any[] = Array.isArray(payJson.data) ? payJson.data : [];
        if (cancelled) return;
        const activeSubs = subs.filter((s) => String(s.status).toLowerCase() === "active");
        // dynamic with real state — no hardcoded 12/1/$48
        const succeededPays = pays.filter((p) => String(p.status).toLowerCase() === "succeeded" || String(p.status).toLowerCase() === "approved");
        const total = succeededPays.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const currency = succeededPays[0]?.currency || subs[0]?.planId?.currency || "BDT";
        setStats({ downloads: succeededPays.length || activeSubs.length, subscriptions: activeSubs.length, totalSpent: total, currency });
        // my apps — active plan features
        const { getApp } = await import("@/lib/data/apps");
        const appsList = activeSubs.map((s: any) => {
          const rawAppId = s.appId || s.planId?.appId || s.planId?.appSlug || s.plan?.appId;
          const planName = s.planId?.name || s.plan?.name || "Plan";
          const app = rawAppId ? getApp(String(rawAppId)) : null;
          return {
            appId: String(rawAppId || ""),
            appName: app?.name || String(rawAppId || planName),
            planName,
            accent: app?.accent || "#6C63FF",
            icon: app?.icon || "◈",
          };
        }).filter((a: any) => a.appId);
        setMyApps(appsList);
        // recent activity — last 3 payments
        const recentList = pays.slice(0, 3).map((p: any) => ({
          id: String(p._id),
          title: p.appId ? `${p.appId} — ${p.paymentMethod || "payment"} ${p.status}` : `${p.status} — ${p.transactionId || ""}`,
          time: p.createdAt ? new Date(p.createdAt).toLocaleDateString("bn-BD") : "",
        }));
        setRecent(recentList);
      } catch {
        if (!cancelled) setStats({ downloads: 0, subscriptions: 0, totalSpent: 0, currency: "BDT" });
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session?.user?.email]);

  if (status === "loading") return <div className="py-20 text-center text-ink/50 dark:text-white/50">{t("loadingWorkspace")}</div>;
  if (!session)
    return (
      <div className="mx-auto max-w-lg rounded-[1.5rem] border border-ink/10 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-[#1a1a2e]">
        <UserRound className="mx-auto text-primary" size={32} />
        <h1 className="mt-5 text-2xl font-bold text-ink dark:text-white">{t("workspaceWaiting")}</h1>
        <p className="mt-3 text-ink/55 dark:text-white/50">{t("signInWithGoogleDesc")}</p>
        <button onClick={() => signIn("google")} className="mt-7 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">
          {t("continueWithGoogle")}
        </button>
      </div>
    );

  const hasImage = !!session.user?.image && !imgError;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#1e1e3a]/90 via-[#252550]/85 to-[#1a1a3a]/90 p-7 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        {/* glassy sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-secondary/15 blur-3xl" />
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary ring-2 ring-white/20 shadow-lg">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user!.image!}
              alt={session.user?.name ?? "Profile"}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-secondary text-white">
              <UserRound />
            </span>
          )}
        </div>
        <p className="relative mt-7 text-xs font-bold uppercase tracking-widest text-white/50">{t("signedInAs")}</p>
        <h1 className="relative mt-2 text-2xl font-bold text-white">{session.user?.name ?? "Nexus member"}</h1>
        <p className="relative mt-1 text-sm text-white/60">{session.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="group relative mt-10 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 backdrop-blur-sm transition hover:bg-red-500/20 hover:text-red-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-red-500/10"
        >
          <LogoutIcon width={16} height={16} /> {t("logOut")}
        </button>
      </section>
      <div className="grid gap-5 sm:grid-cols-3 lg:col-span-1">
        <section className={`group relative overflow-hidden rounded-[1.5rem] border p-5 backdrop-blur-xl transition hover:-translate-y-1 ${isDark ? "border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:border-white/15" : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,15,30,0.06)] hover:shadow-[0_12px_32px_rgba(108,99,255,0.12)] hover:border-primary/15"}`}>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-60 group-hover:opacity-100 transition ${isDark ? "from-primary/10 to-secondary/5" : "from-primary/[0.04] to-secondary/[0.03]"}`} />
          <Download className="relative text-primary" size={19} />
          <p className={`relative mt-6 text-2xl font-bold ${isDark ? "text-white" : "text-[#6C63FF]"}`}>{statsLoading ? "—" : stats?.downloads ?? 0}</p>
          <p className={`relative mt-1 text-xs uppercase tracking-widest transition ${isDark ? "text-white/45 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-600"}`}>{t("downloads")}</p>
        </section>
        <section className={`group relative overflow-hidden rounded-[1.5rem] border p-5 backdrop-blur-xl transition hover:-translate-y-1 ${isDark ? "border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:border-white/15" : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,15,30,0.06)] hover:shadow-[0_12px_32px_rgba(108,99,255,0.12)] hover:border-primary/15"}`}>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-60 group-hover:opacity-100 transition ${isDark ? "from-primary/10 to-secondary/5" : "from-primary/[0.04] to-secondary/[0.03]"}`} />
          <ReceiptText className="relative text-primary" size={19} />
          <p className={`relative mt-6 text-2xl font-bold ${isDark ? "text-white" : "text-[#6C63FF]"}`}>{statsLoading ? "—" : stats?.subscriptions ?? 0}</p>
          <p className={`relative mt-1 text-xs uppercase tracking-widest transition ${isDark ? "text-white/45 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-600"}`}>{t("subscription")}</p>
        </section>
        <section className={`group relative overflow-hidden rounded-[1.5rem] border p-5 backdrop-blur-xl transition hover:-translate-y-1 ${isDark ? "border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:border-white/15" : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,15,30,0.06)] hover:shadow-[0_12px_32px_rgba(0,212,255,0.12)] hover:border-secondary/15"}`}>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-60 group-hover:opacity-100 transition ${isDark ? "from-secondary/10 to-primary/5" : "from-secondary/[0.06] to-primary/[0.04]"}`} />
          <p className={`relative text-2xl font-bold ${isDark ? "text-secondary" : "text-[#00B8DB]"}`}>{statsLoading ? "—" : `${stats?.currency === "USD" ? "$" : "৳"}${stats?.totalSpent ?? 0}`}</p>
          <p className={`relative mt-5 text-xs uppercase tracking-widest transition ${isDark ? "text-white/45 group-hover:text-white/60" : "text-slate-500 group-hover:text-slate-600"}`}>{t("totalSpent")}</p>
        </section>
        <section className={`group relative overflow-hidden rounded-[1.5rem] border p-6 backdrop-blur-xl transition sm:col-span-3 ${isDark ? "border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-transparent shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]" : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,15,30,0.05)] hover:shadow-[0_12px_32px_rgba(108,99,255,0.08)] hover:border-primary/10"}`}>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-0 group-hover:opacity-100 transition ${isDark ? "from-primary/[0.06] to-secondary/[0.04]" : "from-primary/[0.04] to-secondary/[0.02]"}`} />
          <div className="relative flex items-center gap-3">
            <Package className="text-primary" />
            <h2 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{t("myApps")}</h2>
          </div>
          <div className="relative mt-4">
            {statsLoading ? (
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>লোড হচ্ছে...</p>
            ) : myApps.length > 0 ? (
              <div className="space-y-3">
                {myApps.map((a) => (
                  <div key={a.appId} className={`flex items-center gap-3 rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                    <span className="grid h-9 w-9 place-items-center rounded-lg text-white text-sm" style={{ backgroundColor: a.accent }}>{a.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>{a.appName} — {a.planName}</p>
                      <p className={`text-xs leading-5 ${isDark ? "text-white/60" : "text-slate-600"}`}>আপনার {a.planName} প্ল্যানের ফিচার সক্রিয় হয়ে গেছে, চালাতে পারেন।</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm leading-6 ${isDark ? "text-white/55 group-hover:text-white/70" : "text-slate-600 group-hover:text-slate-700"}`}>{t("myAppsDesc")}</p>
            )}
          </div>
        </section>
        <section className={`group relative overflow-hidden rounded-[1.5rem] border p-6 backdrop-blur-xl transition sm:col-span-3 ${isDark ? "border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-transparent shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]" : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,15,30,0.05)] hover:shadow-[0_12px_32px_rgba(108,99,255,0.08)] hover:border-primary/10"}`}>
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent opacity-0 group-hover:opacity-100 transition ${isDark ? "from-primary/[0.06] to-secondary/[0.04]" : "from-primary/[0.04] to-secondary/[0.02]"}`} />
          <div className="relative flex items-center gap-3">
            <Clock3 className="text-primary" />
            <h2 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{t("recentActivity")}</h2>
          </div>
          <div className="relative mt-4">
            {statsLoading ? (
              <p className={`text-sm ${isDark ? "text-white/50" : "text-slate-500"}`}>লোড হচ্ছে...</p>
            ) : recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map((r) => (
                  <div key={r.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/5 text-white/70" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    <span className="truncate font-medium">{r.title}</span>
                    <span className="ml-3 shrink-0 text-xs opacity-60">{r.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm leading-6 ${isDark ? "text-white/55 group-hover:text-white/70" : "text-slate-600 group-hover:text-slate-700"}`}>{t("noRecentDownloads")}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
