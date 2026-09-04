"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { Lang } from "@/lib/i18n/translations";

function FlagIcon({ lang, size = 20 }: { lang: Lang; size?: number }) {
  const src = lang === "bn" ? "https://flagcdn.com/w20/bd.png" : "https://flagcdn.com/w20/us.png";
  const srcSet = lang === "bn" ? "https://flagcdn.com/w40/bd.png 2x" : "https://flagcdn.com/w40/us.png 2x";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      alt={lang}
      width={size}
      height={Math.round((size * 3) / 4)}
      className="rounded-[3px] object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10"
      loading="lazy"
    />
  );
}

const options: { value: Lang; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "bn", label: "বাংলা", short: "BD" },
];

export function LanguageSwitcher({ hideFlag }: { hideFlag?: boolean }) {
  const { lang, setLang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.right - 208 });
    }
  }, [open]);

  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = options.find((o) => o.value === lang) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language"
        className="flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white dark:bg-[#2d2f45] px-3.5 py-2 text-sm font-semibold text-ink dark:text-white hover:bg-paper dark:hover:bg-[#363a52] backdrop-blur transition shadow-sm"
      >
        <Globe size={16} className="text-[#00D4FF]" />
        {hideFlag ? (
          <span className="inline-flex items-center gap-1.5">
            <span>{current.label}</span>
          </span>
        ) : (
          <>
            <span className="hidden sm:inline-flex items-center gap-2">
              <FlagIcon lang={current.value} size={18} />
              <span>{current.label}</span>
            </span>
            <span className="sm:hidden flex items-center gap-1.5">
              <FlagIcon lang={current.value} size={18} />
              <span>{current.label}</span>
            </span>
          </>
        )}
        <ChevronDown size={14} className={`transition text-ink/40 dark:text-white/60 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos && (
        <div
          className={`fixed z-[60] w-52 overflow-hidden rounded-2xl border p-1.5 shadow-xl ${isDark ? "border-white/10 bg-[#1e2030]" : "border-slate-200 bg-white"}`}
          style={{ top: pos.top, left: Math.max(8, Math.min(pos.left, window.innerWidth - 216)) }}
        >
          {options.map((opt) => {
            const isActive = lang === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setLang(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? (isDark ? "bg-[#00D4FF] text-[#0f0f1e] shadow-sm" : "bg-slate-900 text-white shadow-sm") : isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <FlagIcon lang={opt.value} size={20} />
                {opt.label}
                {isActive && <span className="ml-auto text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
