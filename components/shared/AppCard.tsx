"use client";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Star } from "lucide-react";
import type { AppRecord } from "@/lib/data/apps";

function trackRecent(id: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem("kwl-recent-apps") || "[]");
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    localStorage.setItem("kwl-recent-apps", JSON.stringify(next));
  } catch {}
}

export function AppCard({ app }: { app: AppRecord }) {
  return (
    <article className="group relative flex min-h-[300px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)] backdrop-blur-sm transition duration-300 hover:-translate-y-2 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 dark:border-white/10 dark:bg-[#1a1a2e] dark:hover:border-secondary/20 dark:hover:shadow-secondary/10 overflow-hidden">
      {/* Gradient overlay on hover - visible both themes */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-secondary/[0.04] dark:from-primary/5 dark:to-secondary/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl text-2xl text-white shadow-md transition duration-300 group-hover:scale-110 group-hover:shadow-lg"
          style={{ backgroundColor: app.accent }}
        >
          {app.icon}
        </div>
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-primary dark:bg-white/10 dark:text-secondary">
          {app.category}
        </span>
      </div>
      <div className="relative z-10 mt-7 flex-1">
        <Link href={`/apps/${app.id}`} onClick={() => trackRecent(app.id)} className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink hover:text-primary dark:text-white dark:hover:text-secondary transition">
          {app.name}
          <ArrowUpRight size={17} className="opacity-0 transition duration-300 group-hover:opacity-100 group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-3 text-sm leading-6 text-ink/65 dark:text-white/60">{app.description}</p>
      </div>
      <div className="relative z-10 mb-5 flex items-center gap-4 text-xs font-medium text-ink/60 dark:text-white/50">
        <span className="flex items-center gap-1 text-[#b77900] dark:text-[#d69b12]">
          <Star size={13} fill="currentColor" /> {app.rating}
        </span>
        <span>{app.downloads} downloads</span>
      </div>
      <Link
        href={`/apps/${app.id}`}
        onClick={() => trackRecent(app.id)}
        className="relative z-10 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 dark:shadow-secondary/20 dark:hover:shadow-secondary/30"
      >
        <ArrowDownToLine size={16} /> Download
      </Link>
    </article>
  );
}
