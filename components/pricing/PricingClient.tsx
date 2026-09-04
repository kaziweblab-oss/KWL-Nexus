"use client";

import Link from "next/link";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Plan = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  isPopular?: boolean;
};

export function PricingClient({ plans: serverPlans }: { plans: Plan[] }) {
  const { t } = useLanguage();

  const fallbackPlans: Plan[] = [
    {
      name: t("pricingFreeName"),
      price: "$0",
      cadence: "/month",
      description: t("pricingFreeDesc"),
      features: t("pricingFreeFeatures").split(","),
      cta: t("pricingFreeCta"),
      href: "/apps",
      isPopular: false,
    },
    {
      name: t("pricingProName"),
      price: "$12",
      cadence: "/month",
      description: t("pricingProDesc"),
      features: t("pricingProFeatures").split(","),
      cta: t("pricingProCta"),
      href: "/apps",
      isPopular: true,
    },
    {
      name: t("pricingPremiumName"),
      price: "$29",
      cadence: "/month",
      description: t("pricingPremiumDesc"),
      features: t("pricingPremiumFeatures").split(","),
      cta: t("pricingPremiumCta"),
      href: "/apps",
      isPopular: false,
    },
  ];

  const isDev = process.env.NODE_ENV !== "production";
  const plans = serverPlans.length ? serverPlans : isDev ? fallbackPlans : [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
          <Sparkles size={14} /> {t("pricingBadge")}
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink dark:text-white sm:text-5xl">{t("pricingTitle")}</h1>
        <p className="mt-4 text-ink/60 dark:text-white/60">{t("pricingDesc")}</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1a2e] ${p.isPopular ? "ring-2 ring-primary shadow-lg shadow-primary/10 dark:ring-secondary" : "border-slate-200"}`}
          >
            {p.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow dark:bg-secondary dark:text-ink">
                {t("mostPopularBadge")}
              </span>
            )}
            <div className="flex items-center gap-2">
              {p.name === t("pricingFreeName") || p.name === "Free" ? <Zap size={18} className="text-primary" /> : p.name === t("pricingPremiumName") || p.name === "Premium" ? <Crown size={18} className="text-primary" /> : <Sparkles size={18} className="text-primary" />}
              <h3 className="text-lg font-bold text-ink dark:text-white">{p.name}</h3>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ink dark:text-white">{p.price}</span>
              <span className="text-sm text-ink/50 dark:text-white/50">{p.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-ink/60 dark:text-white/60">{p.description}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink/70 dark:text-white/70">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check size={12} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={p.href}
              className={`mt-8 flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition ${p.isPopular ? "bg-primary text-white hover:bg-primary/90 dark:bg-secondary dark:text-ink" : "border border-ink/10 bg-white text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"}`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-ink/40 dark:text-white/40">
        {t("needCustomPlan")} <Link href="/docs" className="font-semibold text-primary hover:underline dark:text-secondary">{t("contactUs")}</Link>
      </p>
    </main>
  );
}
