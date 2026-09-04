"use client";
import { DashboardView } from "@/components/shared/DashboardView";
import { FeedbackHistory } from "@/components/shared/FeedbackHistory";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function DashboardClient() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-16 lg:px-8 bg-[#f6f7fb] dark:bg-transparent">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary dark:text-primary">{t("dashboardWorkspace")}</p>
      <h1 className="mt-4 text-5xl font-bold tracking-[-0.04em] text-[#0F0F2E] dark:text-white">{t("yourDashboard")}</h1>
      <p className="mt-5 max-w-xl text-lg font-medium leading-7 text-slate-600 dark:text-white/60">{t("keepYourTools")}</p>
      <div className="mt-10"><DashboardView /></div>
      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
        <h2 className="font-bold text-ink dark:text-white">{t("myFeedback")}</h2>
        <FeedbackHistory />
      </section>
    </main>
  );
}
