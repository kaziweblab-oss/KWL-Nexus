"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiConsole } from "@/components/docs/ApiConsole";
import { useLanguage } from "@/components/shared/LanguageProvider";

export default function ApiConsolePage() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-16 lg:px-8">
      <Link href="/docs" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50 dark:hover:text-white">
        <ArrowLeft size={16} /> {t("backToDocs")}
      </Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("requestPlayground")}</p>
      <h1 className="mt-3 text-5xl font-bold tracking-[-0.04em] text-ink dark:text-white">{t("testApiLive")}</h1>
      <p className="mt-4 max-w-xl text-lg text-ink/60 dark:text-white/60">{t("testApiDesc")}</p>
      <div className="mt-10">
        <ApiConsole />
      </div>
    </main>
  );
}
