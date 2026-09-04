"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type HeroApp = {
  id: string;
  slug?: string;
  name: string;
  category: string;
  accent?: string;
  downloadCount?: number;
};

export function HeroWorkflowCard() {
  const { t, lang } = useLanguage();
  const isBn = lang === "bn";
  const [app, setApp] = useState<HeroApp | null>(null);

  useEffect(() => {
    fetch("/api/apps/new-releases", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.data) && d.data.length) {
          const first = d.data[0];
          setApp({
            id: first.slug || first.id,
            slug: first.slug,
            name: first.name,
            category: first.category,
            accent: first.accent,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Dynamic title: if app exists, show app name/category else fallback translation
  const dynamicTitle = app ? app.name : t("favouriteWorkflow");
  const subtitle = app ? app.category : t("yourNext");

  // Link to app if available else to /apps
  const href = app ? `/apps/${app.id}` : "/apps";

  return (
    <Link
      href={href}
      className="absolute left-6 top-6 sm:left-8 sm:top-7 flex min-h-[15rem] w-[15rem] sm:h-64 sm:w-64 rotate-2 sm:rotate-3 rounded-[2rem] bg-primary p-6 sm:p-7 text-white shadow-2xl shadow-primary/30 transition duration-300 hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/50 hover:rotate-0 hover:z-20 flex-col justify-between group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-white/60">NEXUS / 01</span>
        <img
          src="/branding/icons/kwl-nexus-icon-white.png"
          alt="KWL NEXUS"
          width={28}
          height={28}
          className="h-7 w-7 rounded-lg bg-white/15 p-1 object-contain backdrop-blur transition group-hover:rotate-12 group-hover:bg-white/25"
          loading="eager"
        />
      </div>
      <div>
        <p className="text-sm text-white/70">{subtitle}</p>
        <p className={`break-words font-bold tracking-tight ${isBn ? "text-3xl leading-tight sm:text-4xl" : "text-3xl sm:text-4xl"}`}>
          {dynamicTitle}
        </p>
        {app && <p className="mt-2 text-xs font-medium text-white/60 truncate">{isBn ? "দেখুন →" : "Explore →"}</p>}
      </div>
    </Link>
  );
}
