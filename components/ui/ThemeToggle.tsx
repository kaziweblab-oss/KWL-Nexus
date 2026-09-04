"use client";

import { useEffect, useState, useRef } from "react";
import { Moon, Sun, Monitor, ChevronDown, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function ThemeToggle({ forceShowLabel }: { forceShowLabel?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.right - 176, width: 176 });
    }
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-[92px] rounded-full border border-white/10 bg-white/5" />;
  }

  const current = theme === "system" ? "system" : resolvedTheme === "dark" ? "dark" : "light";
  const label = current === "system" ? t("themeSystem") : current === "dark" ? t("themeDark") : t("themeLight");
  const Icon = current === "system" ? Monitor : current === "dark" ? Moon : Sun;

  const options: { value: "system" | "light" | "dark"; label: string; icon: typeof Monitor }[] = [
    { value: "system", label: t("themeSystem"), icon: Monitor },
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "dark", label: t("themeDark"), icon: Moon },
  ];

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Select theme"
        className="flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white dark:bg-[#2d2f45] px-3.5 py-2 text-sm font-medium text-ink dark:text-white hover:bg-paper dark:hover:bg-[#363a52] backdrop-blur transition shadow-sm"
      >
        <Icon size={14} className="text-[#00D4FF]" />
        <span className={`${forceShowLabel ? "inline" : "hidden sm:inline"}`}>{label}</span>
        <ChevronDown size={12} className={`text-ink/40 dark:text-white/60 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos && (
        <div
          className={`fixed z-[60] w-44 overflow-hidden rounded-2xl border p-1 shadow-xl ${isDark ? "border-white/10 bg-[#1e2030]" : "border-slate-200 bg-white"}`}
          style={{ top: pos.top, left: Math.max(8, Math.min(pos.left, window.innerWidth - 184)) }}
        >
          {options.map((opt) => {
            const ActiveIcon = opt.icon;
            const isActive = theme === opt.value || (theme === undefined && opt.value === "system");
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? (isDark ? "bg-[#00D4FF] text-[#0f0f1e] shadow-sm" : "bg-slate-900 text-white shadow-sm") : isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <ActiveIcon size={14} />
                {opt.label}
                {isActive && <Check size={12} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
