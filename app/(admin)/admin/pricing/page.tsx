"use client";

import { PricingManager } from "@/components/admin/PricingManager";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function AdminPricingPage() {
  const { t } = useLanguage();
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("monetization")}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("pricingManagement")}</h1>
      <p className="mt-2 text-ink/60 dark:text-white/60">{t("manageGlobalPricingDesc")}</p>
      <div className="mt-8">
        <Suspense fallback={<p className="py-8 text-center text-sm text-ink/50">Loading…</p>}>
          <PricingFromQuery />
        </Suspense>
      </div>
    </main>
  );
}

function PricingFromQuery() {
  const searchParams = useSearchParams();
  return <PricingManager initialApp={searchParams.get("app") ?? ""} />;
}
