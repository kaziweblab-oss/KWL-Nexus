"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GithubRepoBrowser } from "@/components/admin/GithubRepoBrowser";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Repository import is a dedicated flow so catalog editing remains focused.
export default function NewAdminAppPage() {
  const { t } = useLanguage();
  return <main><Link href="/admin/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary"><ArrowLeft size={16} /> {t("backToAppManagement")}</Link><p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("githubImporter")}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{t("addAppFromGitHubTitle")}</h1><p className="mt-2 text-ink/55">{t("chooseRepoDesc")}</p><div className="mt-8"><GithubRepoBrowser /></div></main>;
}
