"use client";

import Link from "next/link";
import { ArrowLeft, Play, ExternalLink, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Config = {
  tutorialVideoUrl?: string;
  tutorialVideoType?: "youtube" | "vimeo" | "custom";
  tutorialTitle?: string;
  tutorialDescription?: string;
  tutorialIsActive?: boolean;
};

export default function GlobalTutorialPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/system-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setConfig(j.data ?? null))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session?.user?.email) { setIsAdmin(false); return; }
    fetch("/api/user/is-admin").then((r) => r.json()).then((d) => setIsAdmin(Boolean(d?.isSuperAdmin || d?.isAdmin))).catch(() => setIsAdmin(false));
  }, [session?.user?.email]);

  const url = config?.tutorialVideoUrl?.trim() ?? "";
  const type = (config?.tutorialVideoType as Config["tutorialVideoType"]) ?? "youtube";
  const title = config?.tutorialTitle || t("tutorialDefaultTitle");
  const desc = config?.tutorialDescription || t("tutorialDefaultDesc");
  const active = config?.tutorialIsActive ?? true;

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-14 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50 dark:hover:text-white">
          <ArrowLeft size={16} /> {t("backToHome")}
        </Link>
        {isAdmin && (
          <Link href="/admin/settings" className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white">
            <Settings2 size={12} /> {t("editVideoAdmin")}
          </Link>
        )}
      </div>

      <div className="mt-10 max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("howToUse")}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.03em] text-ink dark:text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-ink/60 dark:text-white/60">{desc}</p>
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="grid aspect-video place-items-center rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-ink/40 dark:text-white/40">{t("loadingVideo")}</p>
          </div>
        ) : url && active ? (
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-[#1a1a2e]">
            <VideoPlayer url={url} type={type} />
          </div>
        ) : url && !active ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-700 dark:text-amber-300">{t("videoHiddenByAdmin")}</p>
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-200/70">{t("enableFromAdmin")}</p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
              <Play size={22} fill="currentColor" />
            </div>
            <p className="mt-4 font-semibold text-ink dark:text-white">{t("noTutorialVideoYet")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink/50 dark:text-white/50">{t("adminCanAddVideo")}</p>
            {isAdmin && <Link href="/admin/settings" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">{t("addVideoNow")} <ExternalLink size={12} /></Link>}
          </div>
        )}
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("step1")}</p>
          <h3 className="mt-2 font-bold text-ink dark:text-white">{t("browseAppsStep")}</h3>
          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{t("browseAppsDesc")}</p>
          <Link href="/apps" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">{t("exploreApps")} →</Link>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("step2")}</p>
          <h3 className="mt-2 font-bold text-ink dark:text-white">{t("getAccess")}</h3>
          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{t("getAccessDesc")}</p>
          <Link href="/pricing" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">{t("seePricing")}</Link>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("step3")}</p>
          <h3 className="mt-2 font-bold text-ink dark:text-white">{t("downloadAndUse")}</h3>
          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{t("downloadAndUseDesc")}</p>
          <Link href="/my-orders" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">{t("myOrders")} →</Link>
        </article>
      </section>

      <p className="mt-8 text-center text-xs text-ink/40 dark:text-white/30">{t("adminCanChange")}</p>
    </main>
  );
}
