"use client";

import { GuidelinesEditor } from "@/components/admin/GuidelinesEditor";
import { useLanguage } from "@/components/shared/LanguageProvider";

export default function GuidelinesPage() {
  const { t } = useLanguage();
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("contentControl")}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("guidelinesTitle")}</h1>
      <p className="mt-2 text-ink/55 dark:text-white/60">{t("guidelinesDesc")}</p>
      <div className="mt-8">
        <GuidelinesEditor />
      </div>
    </main>
  );
}
