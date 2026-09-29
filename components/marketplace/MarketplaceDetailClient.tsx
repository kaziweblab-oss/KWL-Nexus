"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { BadgeCheck, Star, Download, ShieldCheck, Monitor, Smartphone, Terminal, ChevronLeft, ChevronRight, Check, X, Crown, Sparkles, Zap } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { useToast } from "@/components/ui/Toast";

type Plan = { name: string; price: string; cadence: string; description: string; featured?: boolean; features?: string[]; refundEnabled?: boolean; refundDays?: number | null };

const detailCopy = {
  en: {
    home: "Home", apps: "Apps", verified: "Verified", reviews: "reviews", downloads: "Downloads", safe: "Safe", verifiedBy: "Verified by KWL Nexus", downloadNow: "Download Now", secureDownload: "Secure Download", freePlan: "Free Plan", forever: "Forever", overview: "Overview", features: "Features", screenshots: "Screenshots", changelog: "Changelog", reviewsTab: "Reviews", faq: "FAQ", askAnything: "Ask me anything...", helloAi: "Hello, I'm KWL AI", helpToday: "How can I help you today?", video: "Video", viewAllScreenshots: "View All Screenshots", aboutApp: "About This App", keyFeatures: "Key Features", allScreenshots: "All Screenshots", reviewSoon: "Reviews integration coming soon. Users can leave feedback via the feedback form below.", noFeaturesYet: "No features listed yet.", noChangelogYet: "No changelog entries yet.", faqSoon: "Frequently asked questions will appear here.", secureLogin: "Download requires login", downloadStarted: "Download started", version: "Version", updated: "Updated", size: "Size", category: "Category", developer: "Developer", compatibility: "Compatibility", featureTitles: ["AI Chat", "Summarize", "Translate", "Write Anything", "Code Assistant", "Smart Notes"], featureDescriptions: ["Chat with AI for any question", "Summarize long articles, PDFs, and documents", "Translate text in 100+ languages instantly.", "Generate emails, blogs, reports, and more.", "Write, explain, and debug code with AI.", "Organize notes and ideas in one place."], previewPrompts: ["Summarize", "Write", "Translate", "Code", "Ideas"],
  },
  bn: {
    home: "হোম", apps: "অ্যাপস", verified: "যাচাইকৃত", reviews: "রিভিউ", downloads: "ডাউনলোড", safe: "নিরাপদ", verifiedBy: "KWL Nexus দ্বারা যাচাইকৃত", downloadNow: "এখনই ডাউনলোড", secureDownload: "নিরাপদ ডাউনলোড", freePlan: "ফ্রি প্ল্যান", forever: "চিরস্থায়ী", overview: "সংক্ষিপ্ত বিবরণ", features: "ফিচার", screenshots: "স্ক্রিনশট", changelog: "পরিবর্তন তালিকা", reviewsTab: "রিভিউ", faq: "জিজ্ঞাসা", askAnything: "যেকোনো কিছু জিজ্ঞাসা করুন...", helloAi: "হ্যালো, আমি KWL AI", helpToday: "আজ কীভাবে সাহায্য করতে পারি?", video: "ভিডিও", viewAllScreenshots: "সব স্ক্রিনশট দেখুন", aboutApp: "এই অ্যাপ সম্পর্কে", keyFeatures: "মূল ফিচার", allScreenshots: "সব স্ক্রিনশট", reviewSoon: "রিভিউ সিস্টেম শীঘ্রই আসছে। নিচের ফিডব্যাক ফর্মে মতামত দিতে পারেন।", noFeaturesYet: "এখনো কোনো ফিচার তালিকাভুক্ত হয়নি।", noChangelogYet: "এখনো কোনো চেঞ্জলগ নেই।", faqSoon: "সাধারণ জিজ্ঞাসাগুলো এখানে দেখা যাবে।", secureLogin: "ডাউনলোড করতে লগইন করুন", downloadStarted: "ডাউনলোড শুরু হয়েছে", version: "ভার্সন", updated: "আপডেট", size: "সাইজ", category: "ক্যাটাগরি", developer: "ডেভেলপার", compatibility: "সামঞ্জস্যতা", featureTitles: ["AI চ্যাট", "সারাংশ", "অনুবাদ", "যেকোনো লেখা", "কোড সহকারী", "স্মার্ট নোট"], featureDescriptions: ["যেকোনো প্রশ্নে AI-এর সাথে চ্যাট করুন", "দীর্ঘ আর্টিকেল, PDF ও ডকুমেন্টের সারাংশ তৈরি করুন", "মুহূর্তে ১০০টিরও বেশি ভাষায় অনুবাদ করুন", "ইমেইল, ব্লগ, রিপোর্ট ও আরও অনেক কিছু তৈরি করুন", "AI দিয়ে কোড লিখুন, বুঝুন ও ডিবাগ করুন", "এক জায়গায় নোট ও আইডিয়া সাজান"], previewPrompts: ["সারাংশ", "লেখা", "অনুবাদ", "কোড", "আইডিয়া"],
  },
} as const;

export function MarketplaceDetailClient({
  app,
  plans,
  screenshots,
  previewImageUrl,
  previewVideoUrl,
  reviewCount,
}: {
  app: { id: string; name: string; category: string; icon: string; accent: string; rating: string; downloads: string; description: string; longDescription: string; platforms: string[]; downloadUrls?: { android?: string; windows?: string; linux?: string }; features?: string[]; versions?: { version: string; date: string; notes: string }[] };
  plans: Plan[];
  screenshots: string[];
  previewImageUrl?: string;
  previewVideoUrl?: string;
  reviewCount?: number;
}) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showAllScreenshots, setShowAllScreenshots] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);
  const { lang } = useLanguage();
  const copy = detailCopy[lang];

  function getPlanFeatures(plan: Plan) {
    const masterFeatures = app.features ?? [];
    const selected = new Set((plan.features ?? []).map((feature) => feature.trim().toLowerCase()));
    return masterFeatures.map((feature) => ({ text: feature, active: selected.has(feature.trim().toLowerCase()) }));
  }
  const tabs = [
    { key: "Overview", label: copy.overview },
    { key: "Features", label: copy.features },
    { key: "Screenshots", label: copy.screenshots, badge: String(screenshots.length) },
    { key: "Changelog", label: copy.changelog },
    { key: "Reviews", label: copy.reviewsTab, badge: String(reviewCount ?? 0) },
    { key: "FAQ", label: copy.faq },
  ];
  const platformIcons: Record<string, typeof Monitor> = { Windows: Monitor, macOS: Monitor, Android: Smartphone, Linux: Terminal, iOS: Smartphone };
  const { status } = useSession();
  const { showToast } = useToast();
  const handleDownload = (platform?: string) => {
    if (status !== "authenticated") {
      showToast(copy.secureLogin, "warning");
      signIn("google");
      return;
    }
    // trigger download via API or show toast
    showToast(copy.downloadStarted, "info");
    window.location.assign(`/api/apps/${app.id}/download${platform ? `?platform=${platform.toLowerCase()}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] dark:bg-[#070b18]">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 text-xs">
        <nav className="flex items-center gap-1.5 text-ink/50 dark:text-white/40">
          <Link href="/" className="hover:text-primary dark:hover:text-white">{copy.home}</Link>
          <span>›</span>
          <Link href="/apps" className="hover:text-primary dark:hover:text-white">{copy.apps}</Link>
          <span>›</span>
          <span className="text-ink dark:text-white/80">{app.name}</span>
        </nav>
      </div>

      {/* Header */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.05fr_0.85fr] items-start">
          {/* Left: App info */}
          <div>
            <div className="flex gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl text-3xl text-white shadow-xl shrink-0" style={{ backgroundColor: app.accent }}>
                {app.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-ink dark:text-white sm:text-2xl">{app.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#8b5cf6]/10 px-2 py-0.5 text-[10px] font-bold text-[#8b5cf6] dark:bg-[#8b5cf6]/20 dark:text-[#a78bfa] border border-[#8b5cf6]/20">
                    <BadgeCheck size={12} /> {copy.verified}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#0ea5e9] dark:text-[#38bdf8]">{app.category}</p>
                <p className="text-xs text-ink/60 dark:text-white/60">KWL Nexus Team <BadgeCheck size={12} className="inline text-[#0ea5e9]" /></p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {app.rating ? <span className="flex items-center gap-1 font-semibold text-amber-500"><Star size={13} fill="currentColor" /> {app.rating}</span> : null}
                  <span className="font-normal text-ink/40 dark:text-white/40">({reviewCount ?? 0} {copy.reviews})</span>
                  <span className="flex items-center gap-1 text-ink/60 dark:text-white/60"><Download size={12} /> {app.downloads} <span className="text-ink/40 dark:text-white/40">{copy.downloads}</span></span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck size={12} /> {copy.safe} <span className="text-ink/40 dark:text-white/30 text-[10px]">{copy.verifiedBy}</span></span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/60 dark:text-white/60">{app.description} Your intelligent productivity companion for everyday tasks. Chat with AI, summarize content, translate, generate ideas, manage notes and more — all in one powerful assistant.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["Windows", "Android", "Linux"] as const).map((p) => {
                const Icon = platformIcons[p] ?? Monitor;
                const available = app.platforms.includes(p);
                const title = available ? `Download for ${p}` : `${p} build not published yet`;
                return (
                  <button
                    key={p}
                    type="button"
                    title={title}
                    aria-label={title}
                    disabled={!available}
                    onClick={() => handleDownload(p)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:scale-105 ${available ? "border-ink/10 bg-white text-ink/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70 hover:bg-paper dark:hover:bg-white/10" : "cursor-not-allowed border-ink/5 bg-white/50 text-ink/30 dark:border-white/5 dark:bg-white/[0.03] dark:text-white/30"}`}
                  >
                    <Icon size={13} /> {p}
                  </button>
                );
              })}
            </div>
            {app.platforms.length > 0 && <p className="mt-2 text-[11px] text-ink/40 dark:text-white/30">Tap a highlighted platform to download its build.</p>}
          </div>

          {/* Center: Preview - static single, admin editable (image or video) */}
          <div className="relative overflow-hidden rounded-2xl border border-[#8b5cf6]/20 bg-white p-1 shadow-[0_8px_32px_rgba(139,92,246,0.08)] dark:border-[#8b5cf6]/30 dark:bg-gradient-to-br dark:from-[#0f0f2a] dark:to-[#0a0a1a] dark:shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
            {previewVideoUrl ? (
              <div className="rounded-xl overflow-hidden bg-black">
                {previewVideoUrl.includes("youtube") || previewVideoUrl.includes("vimeo") ? (
                  <div className="flex h-[220px] w-full items-center justify-center bg-black text-white text-sm">Video: {previewVideoUrl}</div>
                ) : (
                  <video src={previewVideoUrl} controls className="h-[220px] w-full object-cover" />
                )}
              </div>
            ) : previewImageUrl ? (
              <div className="rounded-xl overflow-hidden bg-white dark:bg-[#0a0a14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImageUrl} alt={`${app.name} preview`} className="h-[220px] w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#f8f9ff] p-3 dark:bg-[#0a0a14]">
                <div className="flex items-center justify-between text-[10px] text-ink/30 dark:text-white/30 px-2">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-6 rounded-full bg-ink/10 dark:bg-white/10" /> <span className="h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20" /></span>
                  <span className="text-ink/20 dark:text-white/20">✦</span>
                </div>
                <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-xs font-semibold text-ink dark:text-white">{copy.helloAi}</p>
                  <p className="text-xs text-ink/60 dark:text-white/60">{copy.helpToday}</p>
                  <div className="mt-3 flex w-full items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs text-ink/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40">
                    <span className="flex-1 text-left">{copy.askAnything}</span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#6C63FF] text-white"><ChevronRight size={12} /></span>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {copy.previewPrompts.map((t) => (
                      <span key={t} className="rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[10px] text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
              <span className="h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20" />
              <span className="h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20" />
              <span className="h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20" />
              <span className="h-1 w-1 rounded-full bg-ink/20 dark:bg-white/20" />
            </div>
          </div>

          {/* Right: Plan - dynamic from admin */}
          <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#131a2e]">
            <p className="text-xs font-semibold text-ink/60 dark:text-white/60">{plans[0]?.name ?? copy.freePlan}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink dark:text-white">{plans[0]?.price ?? "Free"}</span>
              <span className="text-xs text-ink/40 dark:text-white/40">{plans[0]?.cadence ?? copy.forever}</span>
            </div>
            <button onClick={() => handleDownload()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition cursor-pointer">
              <Download size={14} /> {copy.downloadNow} <Download size={14} />
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-ink/40 dark:text-white/30"><ShieldCheck size={10} /> {copy.secureDownload}</p>
            <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 dark:border-white/5 text-xs">
              {[
                [copy.version, app.versions?.[0]?.version ?? "v2.1.0"],
                [copy.updated, "May 12, 2024"],
                [copy.size, "85.4 MB"],
                [copy.category, app.category],
                [copy.developer, "KWL Nexus Team"],
                [copy.compatibility, "Windows 10+, macOS 11+, Android 8+"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-ink/40 dark:text-white/40">{k}</span>
                  <span className="font-medium text-ink dark:text-white/80">{String(v)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAllPlans(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white py-2 text-xs font-semibold text-ink hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              <span className="text-amber-500">👑</span> View All Plans
            </button>
          </div>
        </div>
      </section>

      {/* View All Plans Modal — professional tall cards */}
      {showAllPlans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAllPlans(false)}>
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-ink/10 bg-[#f8f9ff] p-6 shadow-2xl dark:border-white/10 dark:bg-[#0f0f1e] sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-ink dark:text-white flex items-center gap-2"><Crown size={18} className="text-amber-500"/> All Plans for {app.name}</h3>
                <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{lang==="bn"?"প্রাইস, ফিচার এবং অফার এক নজরে — short overview সহ":"Compare price, features and what's included — short overview."}</p>
              </div>
              <button onClick={() => setShowAllPlans(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/70 dark:hover:bg-red-500 dark:hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 flex flex-wrap justify-around gap-6">
              {plans.map((p) => {
                const feats = getPlanFeatures(p);
                const isFeatured = !!p.featured;
                const expanded = expandedPlan === p.name;
                const visible = expanded ? feats : feats.slice(0, 5);
                return (
                  <div key={p.name} className={`relative flex min-h-[380px] w-full max-w-[340px] flex-1 shrink-0 flex-col rounded-[1.5rem] border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-[#1a1a2e] ${isFeatured ? "border-primary/30 shadow-[0_8px_32px_rgba(124,92,255,0.15)] ring-1 ring-primary/20" : "border-ink/10 dark:border-white/10"}`}>
                    {isFeatured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-3 py-1 text-[11px] font-bold text-white shadow">{lang==="bn"?"জনপ্রিয়":"Popular"}</span>}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-ink dark:text-white flex items-center gap-1.5">{isFeatured?<Sparkles size={14} className="text-primary"/>:<Zap size={14} className="text-ink/30 dark:text-white/30"/>}{p.name}</p>
                      {p.price.includes("Free") || p.price==="Free" ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">Free</span> : null}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-ink dark:text-white">{p.price}</span>
                      <span className="text-xs font-medium text-ink/40 dark:text-white/40">{p.cadence}</span>
                    </div>
                    <p className="mt-2 min-h-[36px] text-xs leading-5 text-ink/60 dark:text-white/60">{p.description}</p>
                    <div className="my-4 h-px bg-ink/10 dark:bg-white/10"/>
                    <ul className="flex-1 space-y-2.5">
                      {visible.map((f) => (
                        <li key={f.text} className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 text-xs ${f.active ? "border-emerald-500/40 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-300" : "border-red-500/35 text-red-600 dark:border-red-400/35 dark:text-red-300"}`}>
                          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[10px] ${f.active ? "border-emerald-500 bg-emerald-500 text-white" : "border-red-500 bg-red-500/10 text-red-500"}`}>
                            {f.active ? <Check size={10}/> : <X size={10}/>}
                          </span>
                          <span className="leading-4">{f.text}</span>
                        </li>
                      ))}
                    </ul>
                    {feats.length > 5 && (
                      <button onClick={() => setExpandedPlan(expanded ? null : p.name)} className="mt-3 text-xs font-semibold text-primary hover:underline dark:text-[#a78bfa]">
                        {expanded ? (lang==="bn"?"কম দেখুন":"Show less") : (lang==="bn"?"আরও দেখুন":"See more")}
                      </button>
                    )}
                    <div className="mt-4 grid gap-2">
                      <button onClick={() => { setShowAllPlans(false); window.location.assign(`/payment?appId=${encodeURIComponent(app.id)}&planId=${encodeURIComponent(p.name)}`); }} className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition ${isFeatured ? "bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] text-white shadow hover:shadow-md" : "border border-ink/10 bg-white text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"}`}>
                        {lang==="bn"?"প্ল্যান নিন":"Choose plan"}
                      </button>
                      {/* See details optional — minimal link */}
                      <button onClick={() => setExpandedPlan(expanded ? null : p.name)} className="w-full rounded-full py-1.5 text-xs font-medium text-ink/50 hover:text-primary dark:text-white/40 dark:hover:text-white">
                        {lang==="bn"?"অফার ডিটেইলস →":"See details →"}
                      </button>
                    </div>
                    {p.refundEnabled && p.refundDays && <p className="mt-3 text-center text-[11px] font-medium text-emerald-600 dark:text-emerald-300">{lang === "bn" ? `${p.refundDays} দিনের রিফান্ড সাপোর্ট` : `${p.refundDays}-day refund support`}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-paper p-1 dark:bg-[#131a2e] dark:border dark:border-white/5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${activeTab === t.key ? "bg-white text-ink shadow-sm dark:bg-white/10 dark:text-white" : "text-ink/60 hover:bg-white hover:text-ink dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"}`}
            >
              {t.label} {t.badge && <span className="ml-1 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content - tab dependent */}
      {(activeTab === "Overview" || activeTab === "Features") && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {activeTab === "Overview" && (
            <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e]">
              <h2 className="text-sm font-bold text-ink dark:text-white">{copy.aboutApp}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60 dark:text-white/60">{app.longDescription}</p>
              {(app.features ?? []).length > 0 && (
                <ul className="mt-4 space-y-2">
                  {(app.features ?? []).slice(0, 6).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-ink/70 dark:text-white/70">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-[#8b5cf6] text-white"><Check size={10} /></span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className={`rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e] ${activeTab === "Features" ? "lg:col-span-2" : ""}`}>
            <h2 className="text-sm font-bold text-ink dark:text-white">{copy.keyFeatures}</h2>
            {(app.features ?? []).length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(app.features ?? []).map((f, i) => (
                  <div key={`${f}-${i}`} className="flex gap-3 rounded-xl border border-ink/5 bg-paper/50 p-3 dark:border-white/5 dark:bg-white/[0.04]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]"><Check size={15} /></span>
                    <p className="self-center text-xs font-bold leading-5 text-ink dark:text-white">{f}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45 dark:border-white/10 dark:text-white/40">{copy.noFeaturesYet}</p>
            )}
          </div>
        </section>
      )}
      {activeTab === "Features" && <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="h-10" /></div>}
      {activeTab === "Changelog" && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e]">
          <h2 className="text-sm font-bold text-ink dark:text-white">{copy.changelog}</h2>
          {(app.versions ?? []).length > 0 ? (
            <div className="mt-4 space-y-4">
              {(app.versions ?? []).map((v) => (
                <div key={v.version} className="border-l-2 border-primary pl-4">
                  <p className="font-bold text-ink dark:text-white">v{v.version} <span className="ml-2 text-xs font-medium text-ink/40 dark:text-white/40">{v.date}</span></p>
                  <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{v.notes}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45 dark:border-white/10 dark:text-white/40">{copy.noChangelogYet}</p>
          )}
        </section>
      )}
      {activeTab === "Reviews" && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e]">
          <h2 className="text-sm font-bold text-ink dark:text-white">{copy.reviewsTab} ({reviewCount ?? 0})</h2>
          <p className="mt-3 text-sm text-ink/60 dark:text-white/60">{copy.reviewSoon}</p>
        </section>
      )}
      {activeTab === "FAQ" && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e]">
          <h2 className="text-sm font-bold text-ink dark:text-white">{copy.faq}</h2>
          <p className="mt-3 text-sm text-ink/60 dark:text-white/60">{copy.faqSoon}</p>
        </section>
      )}

      {/* Screenshots - video first, functional - tab controlled */}
      {(activeTab === "Overview" || activeTab === "Screenshots") && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#131a2e]">
        <h2 className="text-sm font-bold text-ink dark:text-white">{copy.screenshots}</h2>
        <div className="relative mt-4 px-8">
          <div ref={screenshotRef} className="flex gap-3 overflow-x-auto scrollbar-none snap-x scroll-smooth pb-2">
            {screenshots.map((s, i) => {
              const isVideo = typeof s === "string" && (s.match(/\.(mp4|webm|ogg)$/i) || s.includes("youtube") || s.includes("vimeo"));
              const isFirstVideo = i === 0 && isVideo;
              return (
                <div key={i} className="relative aspect-[4/3] min-w-[260px] flex-1 snap-start overflow-hidden rounded-xl border border-[#8b5cf6]/20 bg-white p-1 shadow-sm dark:border-[#8b5cf6]/20 dark:bg-gradient-to-br dark:from-[#0f0f2a] dark:to-[#1a1030] sm:min-w-[300px]">
                  {isFirstVideo && <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{copy.video}</span>}
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#f8f9ff] text-xs text-ink/40 dark:bg-[#0a0a14] dark:text-white/40 overflow-hidden">
                    {isVideo ? (
                      s.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={s} controls className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <span className="flex items-center gap-1 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white">▶</span> Video {i + 1}</span>
                      )
                    ) : typeof s === "string" && s.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <>Screenshot {i + 1}</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button aria-label="Previous" onClick={() => screenshotRef.current?.scrollBy({ left: -320, behavior: "smooth" })} className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-white text-ink shadow-lg ring-1 ring-ink/10 hover:bg-slate-50 dark:border-white/20 dark:bg-[#1a1a2e] dark:text-white dark:ring-white/10 dark:hover:bg-white/10">
            <ChevronLeft size={16} />
          </button>
          <button aria-label="Next" onClick={() => screenshotRef.current?.scrollBy({ left: 320, behavior: "smooth" })} className="absolute right-0 top-1/2 z-10 grid h-9 w-9 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-white text-ink shadow-lg ring-1 ring-ink/10 hover:bg-slate-50 dark:border-white/20 dark:bg-[#1a1a2e] dark:text-white dark:ring-white/10 dark:hover:bg-white/10">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={() => setShowAllScreenshots(true)} className="rounded-full border border-ink/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white cursor-pointer">{copy.viewAllScreenshots}</button>
        </div>
      </section>
      )}

      {/* All Screenshots Modal */}
      {showAllScreenshots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAllScreenshots(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-[#131a2e] dark:border dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink dark:text-white">{copy.allScreenshots}</h3>
              <button onClick={() => setShowAllScreenshots(false)} className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-ink/60 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500 dark:hover:text-white transition">✕</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {screenshots.map((s, i) => {
                const isVideo = typeof s === "string" && (s.match(/\.(mp4|webm|ogg)$/i) || s.includes("youtube") || s.includes("vimeo"));
                return (
                  <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl border bg-white p-1 dark:border-white/10 dark:bg-[#0f0f2a]">
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#f8f9ff] dark:bg-[#0a0a14] overflow-hidden">
                      {isVideo ? (
                        s.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video src={s} controls className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-ink/40 dark:text-white/40">Video {i + 1}: {s}</span>
                        )
                      ) : s.startsWith("http") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-ink/40 dark:text-white/40">Screenshot {i + 1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav imitation not needed */}
    </div>
  );
}
