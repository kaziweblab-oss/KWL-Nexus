"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type Props = {
  size?: number; // logo width
  fullscreen?: boolean;
  label?: string;
};

export function NexusLoader({ size = 180, fullscreen = false, label }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;
  // Transparent logo used for professional loader (favicon svg has no baked bg, 32bppArGB png fallback)
  const src = isDark ? "/branding/icons/kwl-nexus-icon-dark.svg" : "/branding/icons/kwl-nexus-icon-white.png";

  const containerClass = fullscreen
    ? isDark
      ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0E1A]"
      : "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F6F7FB]"
    : "flex flex-col items-center justify-center py-10";

  return (
    <div className={containerClass} aria-busy="true" aria-live="polite">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#6C63FF]/15 via-transparent to-[#00D4FF]/15 blur-3xl" />
      </div>

      <div className="relative rounded-full" style={{ width: size, height: size }}>
        {/* Multicolor vibe behind round logo - blur + theme-aware colors */}
        {/* Outer blurred multicolor blob */}
        <div
          className={
            isDark
              ? "absolute -inset-6 -z-20 rounded-full bg-gradient-to-br from-[#6C63FF]/30 via-[#00D4FF]/25 to-[#FF4D9E]/20 blur-[32px] animate-nexus-pulse"
              : "absolute -inset-6 -z-20 rounded-full bg-gradient-to-br from-[#6C63FF]/20 via-[#00D4FF]/15 to-[#FF8A5C]/15 blur-[28px] animate-nexus-pulse"
          }
        />
        {/* Spinning conic gradient ring - circular spinner */}
        <div
          className={
            isDark
              ? "absolute -inset-[3px] -z-10 rounded-full p-[3px] bg-[conic-gradient(from_0deg,#6C63FF,#00D4FF,#7C3AED,#FF4D9E,#6C63FF)] opacity-70 blur-[0.5px] animate-nexus-spinner"
              : "absolute -inset-[3px] -z-10 rounded-full p-[3px] bg-[conic-gradient(from_0deg,#6C63FF,#00D4FF,#8B5CF6,#F59E0B,#6C63FF)] opacity-50 blur-[0.5px] animate-nexus-spinner"
          }
        >
          <div className={isDark ? "h-full w-full rounded-full bg-[#0A0E1A]" : "h-full w-full rounded-full bg-[#F6F7FB]"} />
        </div>
        {/* Glassmorphism backdrop blur layer - blurs everything behind logo */}
        <div
          className={
            isDark
              ? "absolute inset-0 -z-10 rounded-full bg-[#0A0E1A]/40 backdrop-blur-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]"
              : "absolute inset-0 -z-10 rounded-full bg-white/60 backdrop-blur-2xl border border-ink/[0.06] shadow-[0_8px_32px_rgba(108,99,255,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
          }
        />
        {/* Inner subtle multicolor inner glow */}
        <div
          className={
            isDark
              ? "absolute inset-[8px] -z-10 rounded-full bg-gradient-to-br from-[#6C63FF]/10 via-transparent to-[#00D4FF]/10 blur-xl"
              : "absolute inset-[8px] -z-10 rounded-full bg-gradient-to-br from-[#6C63FF]/08 via-transparent to-[#00D4FF]/08 blur-xl"
          }
        />
        {/* Professional transparent logo - NO baked white bar. Uses favicon transparent (32bppArGB) scaled to hide padding outside circular border */}
        <div className="relative h-full w-full overflow-hidden rounded-full p-[5px] bg-transparent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/favicons/kwl-nexus-favicon.svg"
            alt="KWL NEXUS"
            width={size}
            height={size}
            className="h-full w-full object-contain rounded-full scale-[1.72] origin-center"
            style={{ background: "transparent" }}
            loading="eager"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.src.includes("/branding/favicons/kwl-nexus-favicon.png")) img.src = "/branding/favicons/kwl-nexus-favicon.png";
            }}
          />
          {/* hidden fallback for theme-aware (kept for posterity) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            id={`nexus-fallback-${size}`}
            src={mounted ? src : "/branding/icons/kwl-nexus-icon-white.png"}
            alt=""
            width={size}
            height={size}
            className="hidden"
            style={{ display: "none" }}
            aria-hidden="true"
          />
        </div>
        {/* center energy dot - kept for premium pulse even over video */}
        <span
          className={
            isDark
              ? "pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/0 shadow-[0_0_12px_rgba(255,255,255,0.0)] animate-nexus-dot"
              : "pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 shadow-[0_0_12px_rgba(108,99,255,0.0)] animate-nexus-dot"
          }
        />
      </div>

      {label && (
        <p
          className={
            isDark
              ? "relative mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 animate-nexus-text"
              : "relative mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink/60 animate-nexus-text"
          }
        >
          {label}
        </p>
      )}
      {!label && fullscreen && (
        <p
          className={
            isDark
              ? "relative mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/40 animate-nexus-text"
              : "relative mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40 animate-nexus-text"
          }
        >
          Loading
        </p>
      )}
    </div>
  );
}

// Inline compact variant - with round + blur vibe (transparent favicon)
export function NexusInlineLoader({ size = 48 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const src = isDark ? "/branding/icons/kwl-nexus-icon-dark.svg" : "/branding/icons/kwl-nexus-icon-white.png";
  return (
    <span className="relative inline-flex items-center justify-center rounded-full" style={{ width: size, height: size }}>
      <span
        className={
          isDark
            ? "absolute -inset-1 -z-20 rounded-full bg-gradient-to-br from-[#6C63FF]/30 via-[#00D4FF]/25 to-[#FF4D9E]/20 blur-[10px] animate-nexus-pulse"
            : "absolute -inset-1 -z-20 rounded-full bg-gradient-to-br from-[#6C63FF]/20 via-[#00D4FF]/15 to-[#FF8A5C]/15 blur-[8px] animate-nexus-pulse"
        }
      />
      <span
        className={
          isDark
            ? "absolute -inset-[2px] -z-10 rounded-full p-[2px] bg-[conic-gradient(from_0deg,#6C63FF,#00D4FF,#7C3AED,#FF4D9E,#6C63FF)] opacity-60 animate-nexus-spinner"
            : "absolute -inset-[2px] -z-10 rounded-full p-[2px] bg-[conic-gradient(from_0deg,#6C63FF,#00D4FF,#8B5CF6,#F59E0B,#6C63FF)] opacity-40 animate-nexus-spinner"
        }
      >
        <span className={isDark ? "block h-full w-full rounded-full bg-[#0A0E1A]" : "block h-full w-full rounded-full bg-white"} />
      </span>
      <span
        className={
          isDark
            ? "absolute inset-0 -z-10 rounded-full bg-[#0A0E1A]/30 backdrop-blur-xl border border-white/[0.05]"
            : "absolute inset-0 -z-10 rounded-full bg-white/50 backdrop-blur-xl border border-ink/[0.05]"
        }
      />
      <span className="relative h-full w-full overflow-hidden rounded-full p-[2px] block bg-transparent">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/favicons/kwl-nexus-favicon.svg"
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain rounded-full scale-[1.68] origin-center"
          style={{ background: "transparent" }}
          loading="eager"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.src.includes("/branding/favicons/kwl-nexus-favicon.png")) img.src = "/branding/favicons/kwl-nexus-favicon.png";
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id={`nexus-inline-fallback-${size}`}
          src={mounted ? src : "/branding/icons/kwl-nexus-icon-white.png"}
          alt=""
          width={size}
          height={size}
          className="hidden"
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}
