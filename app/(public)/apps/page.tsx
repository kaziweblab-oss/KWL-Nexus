"use client";

import { AppDirectory } from "@/components/shared/AppDirectory";
import { Suspense } from "react";
import { Code2, Download, Box, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

export default function AppsPage() {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen bg-[#f6f7fb] dark:bg-[#070b18]">
      {/* Hero — improved UI: badge + gradient title + balanced layout + bilingual */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-6 overflow-hidden">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#6C63FF]/12 via-[#00D4FF]/8 to-transparent blur-3xl dark:from-[#6C63FF]/18 dark:via-[#00D4FF]/10" />
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-[#7C3AED]/10 blur-3xl dark:bg-[#7C3AED]/15" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: badge + title + desc — alignment fixed */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6C63FF]/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#6C63FF] shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80">
              <Sparkles size={12} className="text-[#6C63FF] dark:text-[#8b85ff]" />
              {t("popularCategories")} · {t("statsApps")}
            </div>
            <h1 className="mt-4 text-[34px] sm:text-[42px] lg:text-[52px] font-extrabold leading-[1.28] sm:leading-[1.22] lg:leading-[1.18] tracking-tight">
              <span className="bg-gradient-to-r from-[#6C63FF] to-[#7C3AED] bg-clip-text text-transparent">{t("appsDiscoverA")}</span>
              <br />
              <span className="text-ink dark:text-white">{t("appsDiscoverB")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-[14px] sm:text-[15px] leading-6 text-ink/60 dark:text-white/55">
              {t("appsHeroDesc")}
            </p>
          </div>

          {/* Right illustration cluster — kept but polished with glass + orbit */}
          <div className="relative mx-auto h-[168px] w-full max-w-[420px] lg:h-[188px] lg:max-w-[480px] shrink-0">
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-[#6C63FF]/10 via-[#6C63FF]/5 to-transparent blur-2xl dark:from-[#6C63FF]/20 dark:via-[#6C63FF]/10" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 420 180" fill="none">
              <ellipse cx="210" cy="92" rx="175" ry="58" stroke="rgba(108,99,255,0.12)" strokeWidth="1" strokeDasharray="3 5" className="dark:opacity-60" />
              <ellipse cx="210" cy="92" rx="175" ry="58" stroke="rgba(108,99,255,0.18)" strokeWidth="1" strokeDasharray="1 0" className="hidden dark:block opacity-20" />
            </svg>
            <div
              className="absolute left-0 top-3 w-[96px] rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_8px_24px_rgba(108,99,255,0.08)] dark:border-white/10 dark:bg-[#1a2035] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              style={{ animation: "drift-wide1 7s ease-in-out infinite" }}
            >
              <div className="h-1.5 w-8 rounded-full bg-slate-100 dark:bg-white/10" />
              <div className="mt-2 h-1.5 w-12 rounded-full bg-slate-100 dark:bg-white/10" />
              <div className="mt-1.5 h-1.5 w-10 rounded-full bg-slate-100 dark:bg-white/10" />
            </div>
            <div
              className="absolute left-[108px] top-0 grid h-14 w-14 place-items-center rounded-xl bg-[#7C3AED] text-white shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{ animation: "drift-wide2 6.5s ease-in-out infinite" }}
            >
              <Code2 size={24} />
            </div>
            <div
              className="absolute left-[14px] bottom-[12px] grid h-14 w-14 place-items-center rounded-2xl bg-[#4F6EF7] text-white shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{ animation: "drift-wide3 7.2s ease-in-out infinite" }}
            >
              <span className="text-[13px] font-black tracking-widest">AI</span>
            </div>
            <div
              className="absolute left-[84px] bottom-[12px] grid h-14 w-14 place-items-center rounded-2xl bg-white border border-slate-100 text-[#4F6EF7] shadow-md dark:border-white/10 dark:bg-[#1a2035] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{ animation: "drift-wide4 6.8s ease-in-out infinite 0.4s" }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#4F6EF7] text-white text-[13px]">✓</span>
            </div>
            <div
              className="absolute right-[72px] bottom-[14px] grid h-12 w-12 place-items-center rounded-xl bg-[#2ED3D3] text-white shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{ animation: "drift-wide5 6.2s ease-in-out infinite 0.2s" }}
            >
              <Download size={22} />
            </div>
            <div
              className="absolute right-0 top-10 grid h-[52px] w-[52px] place-items-center rounded-xl bg-[#9C6BFF] text-white shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{ animation: "drift-wide6 7.5s ease-in-out infinite 0.6s" }}
            >
              <Box size={22} />
            </div>
            <span className="absolute left-0 top-10 text-[#6C63FF]/30 dark:text-[#6C63FF]/40 text-[10px]">✦</span>
            <span className="absolute right-0 top-2 text-[#9C6BFF]/30 dark:text-[#9C6BFF]/40 text-[10px]">✦</span>
            <span className="absolute right-10 bottom-0 text-[#2ED3D3]/30 dark:text-[#2ED3D3]/40 text-[10px]">✦</span>
          </div>
          <style
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `@keyframes drift-wide1{0%,100%{transform:translate(0,0)}25%{transform:translate(18px,6px)}50%{transform:translate(34px,-4px)}75%{transform:translate(12px,4px)}}@keyframes drift-wide2{0%,100%{transform:translate(0,0)}30%{transform:translate(22px,8px)}60%{transform:translate(40px,-6px)}80%{transform:translate(14px,5px)}}@keyframes drift-wide3{0%,100%{transform:translate(0,0)}25%{transform:translate(20px,-6px)}50%{transform:translate(38px,6px)}75%{transform:translate(14px,-3px)}}@keyframes drift-wide4{0%,100%{transform:translate(0,0)}20%{transform:translate(18px,7px)}50%{transform:translate(36px,-5px)}80%{transform:translate(12px,3px)}}@keyframes drift-wide5{0%,100%{transform:translate(0,0)}30%{transform:translate(-18px,-7px)}60%{transform:translate(-36px,6px)}85%{transform:translate(-12px,-4px)}}@keyframes drift-wide6{0%,100%{transform:translate(0,0)}25%{transform:translate(-20px,6px)}50%{transform:translate(-38px,-5px)}75%{transform:translate(-14px,4px)}}@media(prefers-reduced-motion:reduce){[style*="drift"]{animation:none!important}}`,
            }}
          />
        </div>
      </section>

      {/* Directory */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10">
        <Suspense fallback={<div className="mt-4 h-28 animate-pulse rounded-2xl bg-white dark:bg-white/5" />}>
          <AppDirectory />
        </Suspense>
      </div>
    </main>
  );
}
