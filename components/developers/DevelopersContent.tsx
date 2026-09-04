"use client";

import Link from "next/link";
import { ArrowRight, Code2, BookOpen } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { DeveloperAnimation } from "@/components/developers/DeveloperAnimation";

export function DevelopersContent() {
  const { t } = useLanguage();
  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
      <div className="max-w-2xl">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-white dark:bg-white dark:text-ink">
          <Code2 />
        </div>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("forDevelopersBadge")}</p>
        <h1 className="mt-4 text-5xl font-bold leading-[1.35] tracking-[-0.04em] text-ink dark:text-white sm:leading-[1.3] sm:text-[52px]">{t("developersTitle")}</h1>
        <p className="mt-6 text-lg leading-8 text-ink/60 dark:text-white/60">{t("developersDesc")}</p>
        <Link href="/docs" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition duration-300 hover:-translate-y-1 hover:bg-[#5750e8] hover:shadow-xl hover:shadow-primary/30 active:scale-95">
          <BookOpen size={16} /> {t("developersDocBtn")} <ArrowRight size={16} className="transition duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="lg:pl-6">
        <DeveloperAnimation />
      </div>
    </div>
  );
}
