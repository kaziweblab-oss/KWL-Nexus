"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

type Option = string | { value: string; label: string };

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = normalized.find((o) => o.value === value);

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
      // try to fit below, if not enough space flip above? simple below
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    }
  }, [open]);

  // Close on scroll — dropdown is fixed, so it won't follow the button when modal scrolls
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    // also watch modal form scroll container (overflow-y-auto)
    const formEl = ref.current?.closest("form");
    formEl?.addEventListener("scroll", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      formEl?.removeEventListener("scroll", handler);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${disabled ? "border-ink/10 bg-ink/5 text-ink/40 cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white/30" : "border-ink/10 bg-paper text-ink hover:border-ink/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"}`}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 text-ink/40 dark:text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          className="fixed z-50 max-h-[220px] overflow-y-auto rounded-xl border border-ink/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1a1a2e]"
          style={{ top: pos.top, left: Math.max(8, Math.min(pos.left, window.innerWidth - pos.width - 8)), width: pos.width, minWidth: Math.max(pos.width, 160) }}
        >
          {normalized.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-primary text-white dark:bg-secondary dark:text-ink" : "text-ink/70 hover:bg-paper hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"}`}
              >
                <span>{opt.label}</span>
                {active && <Check size={12} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
