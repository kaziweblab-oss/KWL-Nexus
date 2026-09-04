"use client";

import {
  Search,
  RotateCcw,
  LayoutGrid,
  Briefcase,
  Film,
  Code2,
  Wrench,
  Gamepad2,
  PenTool,
  GraduationCap,
  Package,
  Boxes,
  Monitor,
  Smartphone,
  Laptop,
  Star,
  Crown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download as DownloadIcon,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/shared/LanguageProvider";

const platformOptions = ["All Platforms", "Android", "Windows", "Linux"];
const pricingOptions = ["All Pricing", "Free", "Paid", "Premium"];
const sortOptions = ["Most Popular", "Highest Rated", "Newest"] as const;

type DbApp = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  icon: string;
  iconUrl?: string | null;
  downloads: string;
  downloadCount: number;
  rating: string;
  platforms: string[];
  latestVersion?: string | null;
};

type CategoryMeta = { name: string; icon: typeof Boxes; count: number };

const categoryIconMap: Record<string, typeof Boxes> = {
  "All Apps": LayoutGrid,
  Productivity: Briefcase,
  "Media Tools": Film,
  Development: Code2,
  Utilities: Wrench,
  Gaming: Gamepad2,
  Design: PenTool,
  Education: GraduationCap,
  Business: Package,
};

const platformIcons: Record<string, typeof Monitor> = {
  Android: Smartphone,
  Windows: Monitor,
  Linux: Laptop,
};

function CustomDropdown({
  value,
  options,
  onChange,
  hClass = "h-11",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  hClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    }
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${hClass} relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-ink/70 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition dark:border-white/15 dark:bg-[#1c2238] dark:text-white/80 dark:hover:border-primary/40 dark:hover:bg-white/10 dark:hover:text-white`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={14} className={`pointer-events-none absolute right-2.5 text-ink/30 dark:text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1c2238]"
          style={{ top: pos.top, left: Math.min(pos.left, typeof window !== "undefined" ? window.innerWidth - 180 : pos.left), minWidth: Math.max(pos.width, 160) }}
        >
          <div className="max-h-[240px] overflow-y-auto py-1.5">
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center px-4 py-2.5 text-left text-xs font-medium transition hover:bg-[#f5f0ff] hover:text-[#6C63FF] dark:hover:bg-white/10 dark:hover:text-white ${
                    active ? "bg-[#6C63FF] text-white hover:bg-[#6C63FF] hover:text-white" : "text-ink/70 dark:text-white/70"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LightAppCard({ app, featured }: { app: DbApp; featured?: boolean }) {
  return (
    <article className="relative flex flex-col rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/5 dark:bg-[#131a2e] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      {featured && (
        <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-amber-500 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
          <Crown size={14} fill="currentColor" />
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl text-[18px] font-bold text-white shadow-sm"
          style={{ backgroundColor: app.accent }}
        >
          {app.iconUrl ? <img src={app.iconUrl} alt={app.name} className="h-full w-full object-cover" /> : app.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-bold leading-tight text-ink dark:text-white">{app.name}</h3>
          <p className="text-[11.5px] font-medium text-ink/50 dark:text-white/50">{app.category}</p>
          <div className="mt-1 flex items-center gap-1 text-[11.5px]">
            <Star size={13} className="text-amber-500" fill="currentColor" />
            <span className="font-semibold text-ink dark:text-white">{app.rating}</span>
            <span className="text-ink/40 dark:text-white/40">({app.downloads})</span>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[36px] text-[12.5px] leading-5 text-ink/60 dark:text-white/60">{app.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-ink/30 dark:text-white/30">
          {app.platforms.map((p) => {
            const Icon = platformIcons[p];
            return Icon ? <Icon key={p} size={15} /> : null;
          })}
        </div>
        <Link
          href={`/apps/${app.slug}`}
          className="inline-flex items-center gap-1 rounded-full border border-[#6C63FF]/20 bg-[#f8f6ff] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#6C63FF] hover:bg-[#6C63FF] hover:text-white transition dark:border-[#6C63FF]/30 dark:bg-[#1e2440] dark:text-[#8b85ff] dark:hover:bg-[#6C63FF] dark:hover:text-white"
        >
          Download <span className="text-[11px]">↓</span>
        </Link>
      </div>
    </article>
  );
}

export function AppDirectory() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "All Apps");
  const [platform, setPlatform] = useState("All Platforms");
  const [pricing, setPricing] = useState("All Pricing");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>("Most Popular");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [dbApps, setDbApps] = useState<DbApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/public/apps", { cache: "no-store" });
        const j = await res.json();
        if (active && Array.isArray(j.data)) setDbApps(j.data);
      } catch {
        if (active) setDbApps([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(["All Apps"]);
    dbApps.forEach((a) => set.add(a.category));
    // ensure default set present even if empty
    ["Productivity", "Development", "Design", "Utilities", "Business", "Education", "Gaming", "Media Tools"].forEach((c) => set.add(c));
    return Array.from(set);
  }, [dbApps]);

  const categoryMeta: CategoryMeta[] = useMemo(() => {
    return categories.map((name) => ({
      name,
      icon: categoryIconMap[name] ?? Boxes,
      count: name === "All Apps" ? dbApps.length : dbApps.filter((a) => a.category === name).length,
    }));
  }, [categories, dbApps]);

  const filteredApps = useMemo(() => {
    let list = dbApps.filter((app) => {
      const cat = category === "All Apps" || app.category === category;
      const plat = platform === "All Platforms" || app.platforms.includes(platform);
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(q);
      return cat && plat && matchesQuery;
    });
    if (sortBy === "Most Popular") list = [...list].sort((a, b) => b.downloadCount - a.downloadCount);
    if (sortBy === "Highest Rated") list = [...list].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    return list;
  }, [category, platform, query, sortBy, dbApps]);

  const pageCount = Math.max(1, Math.ceil(filteredApps.length / pageSize));
  const visibleApps = filteredApps.slice((page - 1) * pageSize, page * pageSize);
  const start = filteredApps.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredApps.length);
  const totalDownloads = useMemo(() => dbApps.reduce((s, a) => s + (a.downloadCount || 0), 0), [dbApps]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Record<string, number>>({});
  // Smooth continuous highlight — distance-based 0..1, updates ~30fps for buttery glide (no jump)
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const RADIUS = 260; // px to fade from center (covers ~1.5 cards)
    const tick = (now: number) => {
      if (now - last > 32) {
        const vp = viewportRef.current;
        const track = trackRef.current;
        if (vp && track) {
          const vRect = vp.getBoundingClientRect();
          const vCenter = vRect.left + vRect.width / 2;
          const kids = Array.from(track.children) as HTMLElement[];
          const next: Record<string, number> = {};
          for (const el of kids) {
            const key = el.getAttribute("data-key");
            if (!key) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            const c = r.left + r.width / 2;
            const d = Math.abs(c - vCenter);
            // smooth falloff: 1 at center, 0 beyond RADIUS, cubic for ease
            let t = 1 - d / RADIUS;
            if (t < 0) t = 0;
            if (t > 1) t = 1;
            t = t * t * (3 - 2 * t); // smoothstep
            if (t > 0.02) next[key] = t;
          }
          // shallow compare to avoid noisy renders
          setHighlights((prev) => {
            const keys = Object.keys({ ...prev, ...next });
            for (const k of keys) if ((prev[k] ?? 0).toFixed(3) !== (next[k] ?? 0).toFixed(3)) return next;
            return prev;
          });
        }
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reset = () => {
    setQuery("");
    setCategory("All Apps");
    setPlatform("All Platforms");
    setPricing("All Pricing");
    setSortBy("Most Popular");
    setPage(1);
  };

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRefLg = useRef<HTMLDivElement>(null);
  const filterRefSm = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const inLg = filterRefLg.current?.contains(e.target as Node);
      const inSm = filterRefSm.current?.contains(e.target as Node);
      if (!inLg && !inSm) setFilterOpen(false);
    };
    if (filterOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filterOpen]);

  const activeFilters: { label: string; onClear: () => void }[] = [];
  if (category !== "All Apps") activeFilters.push({ label: category, onClear: () => { setCategory("All Apps"); setPage(1); } });
  if (platform !== "All Platforms") activeFilters.push({ label: platform, onClear: () => { setPlatform("All Platforms"); setPage(1); } });
  if (pricing !== "All Pricing") activeFilters.push({ label: pricing, onClear: () => { setPricing("All Pricing"); setPage(1); } });
  if (query.trim()) activeFilters.push({ label: `Search: ${query.trim()}`, onClear: () => { setQuery(""); setPage(1); } });
  const activeCount = (category !== "All Apps" ? 1 : 0) + (platform !== "All Platforms" ? 1 : 0) + (pricing !== "All Pricing" ? 1 : 0);

  return (
    <>
      {/* Popular Categories — i18n */}
      <div className="mt-4 sm:mt-5">
        <p className="text-[13px] sm:text-sm font-semibold text-ink dark:text-white">{t("popularCategories")}</p>
        <div ref={viewportRef} className="mt-2 sm:mt-3 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          <div ref={trackRef} className="flex w-max gap-3 sm:gap-3.5 py-2 animate-popular-marquee hover:[animation-play-state:paused]">
            {[...categoryMeta, ...categoryMeta].map((c, idx) => {
              const Icon = c.icon;
              const active = category === c.name;
              const key = `${c.name}-${idx}`;
              const h = highlights[key] ?? 0;
              const scale = 1 + h * 0.045;
              const shadow = h > 0.02 ? `0 ${8 + h * 10}px ${14 + h * 22}px rgba(108,99,255,${0.06 + h * 0.16}), 0 ${2 + h * 4}px ${6 + h * 10}px rgba(0,0,0,${0.03 + h * 0.06})` : undefined;
              return (
                <button
                  key={key}
                  data-key={key}
                  onClick={() => {
                    setCategory(c.name);
                    setPage(1);
                  }}
                  className={`group relative flex min-w-[148px] sm:min-w-[168px] shrink-0 items-center gap-3 sm:gap-3.5 overflow-hidden rounded-xl sm:rounded-2xl border px-4 sm:px-5 py-3.5 sm:py-4 text-left will-change-transform ${
                    active
                      ? "border-[#6C63FF]/20 bg-[#f5f0ff]/90 backdrop-blur-xl dark:border-[#6C63FF]/30 dark:bg-[#252a4a]/90"
                      : "border-white/60 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-[#151a2d]/90"
                  } shadow-[0_4px_14px_rgba(108,99,255,0.06),0_2px_6px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(108,99,255,0.12)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]`}
                  style={{
                    transform: `scale(${scale})`,
                    boxShadow: shadow,
                    zIndex: h > 0.4 ? 2 : 1,
                    borderColor: h > 0.35 ? `rgba(108,99,255,${0.18 + h * 0.22})` : undefined,
                    transition: "transform 120ms linear, box-shadow 120ms linear, border-color 120ms linear",
                  }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/70 via-white/10 to-transparent opacity-80 dark:from-white/5 dark:via-transparent dark:opacity-60" />
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10" />
                  <span className={`relative grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl transition ${active ? "bg-white text-[#6C63FF] shadow-[0_2px_10px_rgba(108,99,255,0.18)] dark:bg-[#252a4a] dark:text-[#8b85ff] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]" : "bg-[#f2efff] text-[#6C63FF] shadow-sm group-hover:shadow-[0_4px_12px_rgba(108,99,255,0.15)] dark:bg-white/10 dark:text-[#8b85ff] dark:group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"}`}>
                    <Icon size={20} />
                  </span>
                  <span className="relative leading-none">
                    <span className="block text-[13px] sm:text-sm font-semibold text-ink dark:text-white">{c.name}</span>
                    <span className="block text-[12px] sm:text-[13px] font-medium text-ink/40 dark:text-white/40">{c.count}</span>
                  </span>
                </button>
              );
            })}
            {["a", "b"].map((k) => {
              const key = `viewall-${k}`;
              const h = highlights[key] ?? 0;
              const scale = 1 + h * 0.045;
              return (
                <button
                  key={key}
                  data-key={key}
                  onClick={() => {
                    setCategory("All Apps");
                    setPage(1);
                  }}
                  className="group relative flex min-w-[96px] sm:min-w-[108px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl sm:rounded-2xl border px-3 py-3.5 sm:py-4 backdrop-blur-xl will-change-transform border-white/60 bg-white/80 text-ink/50 shadow-[0_4px_14px_rgba(108,99,255,0.06),0_2px_6px_rgba(0,0,0,0.03)] dark:border-white/5 dark:bg-[#151a2d]/90 dark:text-white/50 dark:shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(108,99,255,0.12)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
                  style={{
                    transform: `scale(${scale})`,
                    boxShadow: h > 0.02 ? `0 ${8 + h * 10}px ${14 + h * 22}px rgba(108,99,255,${0.06 + h * 0.16}), 0 ${2 + h * 4}px ${6 + h * 10}px rgba(0,0,0,${0.03 + h * 0.06})` : undefined,
                    zIndex: h > 0.4 ? 2 : 1,
                    borderColor: h > 0.35 ? `rgba(108,99,255,${0.18 + h * 0.22})` : undefined,
                    transition: "transform 120ms linear, box-shadow 120ms linear, border-color 120ms linear",
                  }}
                >
                  <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/70 to-transparent opacity-60" />
                  <LayoutGrid size={18} className="relative" />
                  <span className="relative text-[11px] sm:text-xs font-medium">{t("viewAll")}</span>
                </button>
              );
            })}
          </div>
        </div>
        <style
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `@keyframes popular-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.animate-popular-marquee{animation:popular-marquee 32s linear infinite}@media(prefers-reduced-motion:reduce){.animate-popular-marquee{animation:none;transform:none}}`,
          }}
        />
      </div>

      {/* Stats bar — i18n + real counts */}
      <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3 rounded-2xl border border-[#ede8ff] bg-[#f5f0ff] p-2 sm:p-3 lg:grid-cols-4 dark:border-white/5 dark:bg-[#131a2e]">
        {[
          { label: t("statsApps"), value: `${dbApps.length || 0}+`, icon: Boxes, color: "text-[#6C63FF] bg-white" },
          { label: t("statsDownloads"), value: totalDownloads ? `${(totalDownloads/1000).toFixed(0)}K+` : "0+", icon: DownloadIcon, color: "text-[#0ea5e9] bg-white" },
          { label: t("statsUsers"), value: "10K+", icon: LayoutGrid, color: "text-[#6C63FF] bg-white" },
          { label: t("statsRating"), value: "4.9/5", icon: Star, color: "text-amber-500 bg-white" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-[#ede8ff] bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-sm dark:border-white/5 dark:bg-[#1a2030]">
              <span className={`grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-lg sm:rounded-xl border border-slate-100 dark:border-white/5 ${s.color} dark:bg-[#131a2e]`}>
                <Icon size={18} />
              </span>
              <span className="leading-none min-w-0">
                <span className="block text-[15px] sm:text-base font-bold text-ink dark:text-white">{s.value}</span>
                <span className="block text-[11px] sm:text-xs font-medium text-ink/40 dark:text-white/40 truncate">{s.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Filter bar — i18n */}
      <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/5 dark:bg-[#13172b]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="group relative flex-1 min-w-0">
              <span className="sr-only">Search apps</span>
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 transition-colors group-hover:text-black group-focus-within:text-black dark:text-white/30 dark:group-hover:text-white" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("searchApps")}
                className="h-10 sm:h-11 w-full rounded-xl border border-slate-100 bg-[#f8f9ff] pl-10 pr-4 text-[13px] sm:text-sm text-ink outline-none caret-black placeholder:text-ink/30 hover:border-slate-200 hover:bg-white hover:text-black hover:placeholder:text-black/50 group-hover:border-slate-200 group-hover:bg-white focus:border-[#6C63FF]/30 focus:bg-white hover:cursor-text focus:text-black transition-colors dark:border-white/10 dark:bg-[#0f1426] dark:text-white dark:placeholder:text-white/40 dark:hover:border-white/20 dark:hover:bg-[#151b33] dark:hover:text-white dark:group-hover:border-white/10 dark:group-hover:bg-[#0f1426] dark:focus:border-[#6C63FF]/40 dark:focus:bg-[#0f1426] dark:caret-white"
              />
            </label>
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <div ref={filterRefLg} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${filterOpen || activeCount ? "border-[#6C63FF] bg-[#6C63FF] text-white shadow-sm" : "border-slate-200 bg-white text-ink/70 hover:border-slate-300 hover:bg-slate-50 hover:text-ink dark:border-white/15 dark:bg-[#1e2442] dark:text-white/80 dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:text-white"}`}
                >
                  <SlidersHorizontal size={14} /> {t("filter")} {activeCount ? `(${activeCount})` : ""}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[560px] max-w-[90vw] overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.14)] dark:border-white/10 dark:bg-[#1c2238]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-ink dark:text-white">{t("filter")}</p>
                      <button onClick={() => setFilterOpen(false)} className="group grid h-7 w-7 place-items-center rounded-full bg-white hover:bg-red-50 cursor-pointer border border-transparent hover:border-red-200 transition dark:bg-transparent dark:hover:bg-red-500/10 dark:hover:border-red-500/20">
                        <X size={14} className="text-ink/50 group-hover:text-red-600 dark:text-white/50 dark:group-hover:text-red-400 transition" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Category</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {categories.map((c) => {
                            const active = c === category;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => { setCategory(c); setPage(1); }}
                                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${active ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10"}`}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Platform</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {platformOptions.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => { setPlatform(p); setPage(1); }}
                              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${platform === p ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10"}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Pricing</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pricingOptions.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => { setPricing(p); setPage(1); }}
                              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${pricing === p ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10"}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
                      <button
                        onClick={reset}
                        disabled={activeCount === 0}
                        className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${activeCount === 0 ? "cursor-not-allowed border-slate-200 bg-slate-100 text-ink/30 opacity-60 dark:border-white/5 dark:bg-white/5 dark:text-white/30" : "cursor-pointer border-slate-200 bg-white text-ink/60 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:bg-[#13172b] dark:text-white/60 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"}`}
                      >
                        Clear all
                      </button>
                      <button onClick={() => setFilterOpen(false)} className="cursor-pointer rounded-full bg-[#6C63FF] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#5a53e0]">Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium text-ink/40 whitespace-nowrap dark:text-white/40">{t("sortBy")}</span>
              <CustomDropdown value={sortBy} options={[...sortOptions]} onChange={(v) => setSortBy(v as typeof sortBy)} hClass="h-11" />
              <button
                onClick={reset}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-ink/60 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-sm whitespace-nowrap dark:border-white/15 dark:bg-[#1e2442] dark:text-white/80 dark:hover:border-red-400/50 dark:hover:bg-red-500/15 dark:hover:text-red-300 dark:hover:shadow-md transition"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
            <div ref={filterRefSm} className="relative shrink-0 lg:hidden">
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${filterOpen || activeCount ? "border-[#6C63FF] bg-[#6C63FF] text-white shadow-sm" : "border-slate-200 bg-white text-ink/70 hover:border-slate-300 hover:bg-slate-50 hover:text-ink dark:border-white/15 dark:bg-[#1e2442] dark:text-white/80 dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:text-white"}`}
              >
                <SlidersHorizontal size={14} /> {t("filter")} {activeCount ? `(${activeCount})` : ""}
              </button>
              {filterOpen && (
                <div className="fixed left-4 right-4 top-[160px] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.14)] dark:border-white/10 dark:bg-[#1c2238] sm:left-auto sm:right-0 sm:w-[360px]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink dark:text-white">{t("filter")}</p>
                    <button onClick={() => setFilterOpen(false)} className="group grid h-7 w-7 place-items-center rounded-full bg-white hover:bg-red-50 cursor-pointer border border-transparent hover:border-red-200 transition dark:bg-transparent dark:hover:bg-red-500/10 dark:hover:border-red-500/20">
                      <X size={14} className="text-ink/50 group-hover:text-red-600 dark:text-white/50 dark:group-hover:text-red-400 transition" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Category</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {categories.map((c) => {
                          const active = c === category;
                          return (
                            <button key={c} type="button" onClick={() => { setCategory(c); setPage(1); }} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70"}`}>{c}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Platform</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {platformOptions.map((p) => (
                          <button key={p} type="button" onClick={() => { setPlatform(p); setPage(1); }} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${platform === p ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70"}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Pricing</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pricingOptions.map((p) => (
                          <button key={p} type="button" onClick={() => { setPricing(p); setPage(1); }} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${pricing === p ? "border-[#6C63FF] bg-[#6C63FF] text-white" : "border-slate-200 bg-white text-ink/70 dark:border-white/10 dark:bg-[#13172b] dark:text-white/70"}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={reset}
                      disabled={activeCount === 0}
                      className={`flex-1 rounded-full border py-2 text-xs font-semibold transition ${activeCount === 0 ? "cursor-not-allowed border-slate-200 bg-slate-100 text-ink/30 opacity-60 dark:border-white/5 dark:bg-white/5 dark:text-white/30" : "cursor-pointer border-slate-200 bg-white text-ink/60 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:bg-[#13172b] dark:text-white/60 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"}`}
                    >
                      Clear
                    </button>
                    <button onClick={() => setFilterOpen(false)} className="flex-1 cursor-pointer rounded-full bg-[#6C63FF] py-2 text-xs font-semibold text-white hover:bg-[#5a53e0]">Apply</button>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-ink/40 whitespace-nowrap shrink-0 dark:text-white/40">{t("sortBy")}</span>
            <CustomDropdown value={sortBy} options={[...sortOptions]} onChange={(v) => setSortBy(v as typeof sortBy)} hClass="h-9" />
            <button
              onClick={reset}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-ink/60 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-sm whitespace-nowrap dark:border-white/15 dark:bg-[#1e2442] dark:text-white/80 dark:hover:border-red-400/50 dark:hover:bg-red-500/15 dark:hover:text-red-300 dark:hover:shadow-md transition"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
            {activeFilters.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full border border-[#6C63FF]/20 bg-[#f5f0ff] px-3 py-1 text-xs font-semibold text-[#6C63FF] dark:border-[#6C63FF]/30 dark:bg-[#1e2440] dark:text-[#8b85ff]">
                {f.label}
                <button type="button" onClick={f.onClear} className="grid h-4 w-4 place-items-center rounded-full bg-[#6C63FF] text-white cursor-pointer hover:bg-[#5a53e0]">
                  <X size={10} />
                </button>
              </span>
            ))}
            <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white">
              <X size={12} /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* All Apps header — i18n */}
      <div className="mt-6 sm:mt-8 flex flex-col gap-1 sm:flex-row sm:items-center justify-between">
        <h2 className="text-[14px] sm:text-[15px] font-bold text-ink dark:text-white">{t("allAppsCount", { count: String(filteredApps.length) })}</h2>
        <p className="text-[11px] sm:text-xs font-medium text-ink/40 dark:text-white/40">
          {t("showingApps", { start: String(start), end: String(end), count: String(filteredApps.length) })}
        </p>
      </div>

      {loading ? (
        <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-2xl bg-white dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleApps.map((app, idx) => (
            <LightAppCard key={app.id} app={app} featured={idx < 2} />
          ))}
        </div>
      )}
      {!loading && !filteredApps.length && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-ink/50 dark:border-white/10 dark:bg-[#13172b] dark:text-white/50">{t("noAppsMatch")}</div>
      )}

      {filteredApps.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-ink/60 shadow-sm transition hover:border-[#6C63FF] hover:bg-[#6C63FF] hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-ink/60 disabled:hover:shadow-sm dark:border-white/10 dark:bg-[#1c2238] dark:text-white/60 dark:hover:border-[#6C63FF] dark:hover:bg-[#6C63FF] dark:hover:text-white dark:disabled:hover:border-white/10 dark:disabled:hover:bg-[#1c2238]"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: pageCount }).map((_, i) => {
            const n = i + 1;
            const active = n === page;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                aria-current={active ? "page" : undefined}
                className={`grid h-8 min-w-8 place-items-center rounded-xl px-2.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/20 scale-[1.02]"
                    : "border border-slate-200 bg-white text-ink/60 shadow-sm hover:border-[#6C63FF]/30 hover:bg-[#f5f0ff] hover:text-[#6C63FF] hover:shadow dark:border-white/10 dark:bg-[#1c2238] dark:text-white/60 dark:hover:border-[#6C63FF]/40 dark:hover:bg-[#252a4a] dark:hover:text-white dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                }`}
              >
                {n}
              </button>
            );
          })}
          {pageCount > 5 && <span className="px-1 text-xs font-medium text-ink/30 dark:text-white/30">…</span>}
          <button
            disabled={page === pageCount}
            onClick={() => setPage((c) => Math.min(pageCount, c + 1))}
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-ink/60 shadow-sm transition hover:border-[#6C63FF] hover:bg-[#6C63FF] hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-ink/60 disabled:hover:shadow-sm dark:border-white/10 dark:bg-[#1c2238] dark:text-white/60 dark:hover:border-[#6C63FF] dark:hover:bg-[#6C63FF] dark:hover:text-white dark:disabled:hover:border-white/10 dark:disabled:hover:bg-[#1c2238]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 lg:hidden">
        <button
          onClick={() => setPage(1)}
          className="w-full rounded-xl border border-[#6C63FF]/20 bg-white py-3 text-sm font-semibold text-[#6C63FF] dark:border-[#6C63FF]/30 dark:bg-[#1c2238] dark:text-[#8b85ff] dark:hover:bg-[#252a4a]"
        >
          {t("viewAllApps")}
        </button>
      </div>
    </>
  );
}
