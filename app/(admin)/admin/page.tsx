"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Plus, UserPlus, Palette } from "lucide-react";
import { AdminStatCards } from "@/components/admin/AdminStatCards";
import { FeedbackAnalytics } from "@/components/admin/FeedbackAnalytics";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Admin overview keeps store metrics and feedback signals in one place.
export default function AdminPage() {
  const { t } = useLanguage();
  return <main><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("nexusControl")}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{t("goodMorningAdmin")}</h1><p className="mt-2 text-ink/55">{t("hereIsWhat")}</p></div><Link href="/" className="text-sm font-semibold text-primary">{t("viewPublicStore")} <ArrowRight className="inline" size={15} /></Link></div><div className="mt-8"><AdminStatCards /></div><FeedbackAnalytics /><div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><RecentActivity /><section className="rounded-2xl bg-ink p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">{t("quickActions")}</p><div className="mt-5 grid gap-3"><Link href="/admin/apps" className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-primary"><Boxes size={17} /> {t("manageAppLibrary")}</Link><Link href="/admin/users" className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-primary"><UserPlus size={17} /> {t("reviewUsers")}</Link><Link href="/admin/branding" className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-primary"><Palette size={17} /> {t("brandingCardTitle")}</Link><Link href="/admin/payments" className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary border border-primary/20 shadow-sm transition hover:bg-primary hover:text-white hover:border-primary hover:shadow-md dark:bg-white dark:text-primary dark:hover:bg-primary dark:hover:text-white dark:border-white/20"><Plus size={17} /> {t("reviewPayments")}</Link></div></section></div></main>;
}
