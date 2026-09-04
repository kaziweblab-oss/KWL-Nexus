"use client";

import { BrandingSettings } from "@/components/shared/BrandingSettings";
import { useLanguage } from "@/components/shared/LanguageProvider";

export default function BrandingPage() {
  const { t } = useLanguage();
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("systemConfiguration")}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("brandingTitle")}</h1>
      <p className="mt-2 text-ink/55 dark:text-white/60">{t("brandingDesc")}</p>
      <div className="mt-8">
        <BrandingSettings />
      </div>
    </main>
  );
}
