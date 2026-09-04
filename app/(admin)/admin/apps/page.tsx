"use client";

import { AppManagement } from "@/components/admin/AdminTables";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

// App operations include publishing, editing, deletion, and release visibility.
export default function AdminAppsPage() {
  const { t } = useLanguage();
  return <main><p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("catalogOperations")}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("appManagement")}</h1><p className="mt-2 text-ink/55 dark:text-white/50">{t("importGitHubDesc")}</p><div className="mt-4 flex gap-3"><Link href="/admin/apps/new" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 dark:bg-white dark:text-ink dark:hover:bg-primary dark:hover:text-white"><Rocket size={14}/> {t("manageNewReleases")}</Link></div><div className="mt-8"><AppManagement /></div></main>;
}
