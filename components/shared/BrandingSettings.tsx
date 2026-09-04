"use client";

import { useEffect, useState } from "react";
import { Check, Image as ImageIcon, Palette, Layout, Sun, Moon, Trash2, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

const defaultState = {
  brandName: "KWL-NEXUS",
  brandLogo: "",
  brandLogoLight: "",
  brandLogoDark: "",
  brandIcon: "",
  brandIconLight: "",
  brandIconDark: "",
  brandFavicon: "",
  brandBanner: "",
  brandBannerLight: "",
  brandBannerDark: "",
  brandAppIcon: "",
  ogImage: "",
  primaryColor: "#6C63FF",
  secondaryColor: "#00D4FF",
  accentColor: "#17172B",
};

type Config = typeof defaultState;

export function BrandingSettings() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<Config>(defaultState);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system-config")
      .then((res) => (res.ok ? res.json() : { data: defaultState }))
      .then((payload) => setConfig((prev) => ({ ...prev, ...(payload.data ?? {}) } as Config)))
      .catch(() => setConfig(defaultState));
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/system-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
        try { window.dispatchEvent(new Event("branding-updated")); } catch {}
      }
    } finally {
      setSaving(false);
    }
  }

  function convertToBase64(file: File, key: keyof Config) {
    const reader = new FileReader();
    reader.onload = () => setConfig((current) => ({ ...current, [key]: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  function UploadField({
    label,
    icon: Icon,
    value,
    fieldKey,
    hint,
    variant = "default",
  }: {
    label: string;
    icon: typeof ImageIcon;
    value: string;
    fieldKey: keyof Config;
    hint: string;
    variant?: "default" | "light" | "dark";
  }) {
    const isLight = variant === "light";
    const isDark = variant === "dark";
    const boxClass = isLight
      ? "border-ink/10 bg-white text-ink/60 hover:border-primary hover:bg-primary/[0.04] hover:text-primary hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
      : isDark
        ? "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08] hover:text-white hover:shadow-md hover:-translate-y-0.5"
        : "border-ink/15 bg-paper text-ink/60 hover:border-primary/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20 dark:hover:bg-white/10";
    const hintClass = isLight ? "text-ink/45" : isDark ? "text-white/40" : "text-ink/40 dark:text-white/40";
    const labelClass = isLight ? "text-ink" : isDark ? "text-white" : "text-ink/60 dark:text-white/60";
    const previewClass = isLight
      ? "border-ink/10 bg-white shadow-sm"
      : isDark
        ? "border-white/10 bg-[#1e2442] shadow-inner"
        : "border-ink/10 bg-white dark:border-white/10 dark:bg-[#1a1a2e]";
    return (
      <div>
        <label className={`mb-2 flex items-center gap-2 text-sm font-semibold ${labelClass}`}>{label}</label>
        <label className={`group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-sm transition-all duration-200 ${boxClass}`}>
          <span className={`grid h-9 w-9 place-items-center rounded-xl transition-colors duration-200 ${isLight ? "bg-ink/5 text-ink/60 group-hover:bg-primary group-hover:text-white" : isDark ? "bg-white/10 text-white/70 group-hover:bg-white group-hover:text-[#0f1225]" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"}`}>
            <Icon size={16} />
          </span>
          <span className="font-medium transition-colors">{t("chooseImage")}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && convertToBase64(event.target.files[0], fieldKey)} />
        </label>
        <p className={`mt-1.5 text-xs ${hintClass}`}>{hint}</p>
        {value && <img src={value} alt={`${label} preview`} className={`mt-3 h-20 w-auto rounded-2xl border object-contain p-2 shadow-sm ${previewClass}`} />}
        {value && (
          <button
            type="button"
            onClick={() => setConfig((c) => ({ ...c, [fieldKey]: "" }))}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-md active:scale-95 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 size={12} /> {t("remove")} {label}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-[24px] border border-ink/5 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:border-white/5 dark:bg-[#1a1a2e] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md">
            <Palette size={18} />
          </span>
          <div>
            <h2 className="flex items-center gap-2 font-bold text-ink dark:text-white">{t("brandingHeader")} <Sparkles size={14} className="text-primary" /></h2>
            <p className="text-xs text-ink/50 dark:text-white/50">{t("brandingOnlyLogoBannerDesc")}</p>
          </div>
        </div>
        <span className="hidden shrink-0 whitespace-nowrap rounded-full border border-ink/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70 sm:inline-flex">{t("brandingLogoBannerOnly")}</span>
      </div>

      <div className="mt-6 max-w-md">
        <label className="block text-sm font-semibold text-ink/70 dark:text-white/70">
          {t("brandNameLabel")}
          <input value={config.brandName} onChange={(event) => setConfig((current) => ({ ...current, brandName: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-[#fcfcfd] px-4 text-sm font-medium text-ink shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-[#1e2442] dark:text-white" />
        </label>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[20px] border border-ink/5 bg-[#fcfcfd] p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15"><Sun size={16} /></span>
            <div>
              <p className="text-sm font-bold text-ink dark:text-white">{t("lightTheme")}</p>
              <p className="text-xs text-ink/50 dark:text-white/40">{t("usedOnLightBg")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            <UploadField label={t("logoLightLabel")} icon={ImageIcon} value={config.brandLogoLight || config.brandLogo} fieldKey="brandLogoLight" hint={t("logoLightHint")} variant="light" />
            <UploadField label={t("bannerLightLabel")} icon={Layout} value={config.brandBannerLight || config.brandBanner} fieldKey="brandBannerLight" hint={t("bannerLightHint")} variant="light" />
          </div>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-[#0f1225] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/10"><Moon size={16} /></span>
            <div>
              <p className="text-sm font-bold text-white">{t("darkTheme")}</p>
              <p className="text-xs text-white/50">{t("usedOnDarkBg")}</p>
            </div>
          </div>
          <div className="mt-5 space-y-5">
            <UploadField label={t("logoDarkLabel")} icon={ImageIcon} value={config.brandLogoDark || config.brandLogo} fieldKey="brandLogoDark" hint={t("logoDarkHint")} variant="dark" />
            <UploadField label={t("bannerDarkLabel")} icon={Layout} value={config.brandBannerDark || config.brandBanner} fieldKey="brandBannerDark" hint={t("bannerDarkHint")} variant="dark" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <style dangerouslySetInnerHTML={{ __html: `input[type="color"]::-webkit-color-swatch{border-radius:9999px;border:none}input[type="color"]::-webkit-color-swatch-wrapper{padding:0;border-radius:9999px}input[type="color"]::-moz-color-swatch{border-radius:9999px;border:none}` }} />
        <label className="group block">
          <span className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("primaryColorLabel")}</span>
          <span className="mt-2 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-2 shadow-sm transition group-hover:border-primary/20 dark:border-white/10 dark:bg-white/5">
            <input type="color" value={config.primaryColor} onChange={(event) => setConfig((current) => ({ ...current, primaryColor: event.target.value }))} className="h-9 w-9 cursor-pointer appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0" />
            <span className="font-mono text-xs font-medium text-ink/60 dark:text-white/60">{config.primaryColor}</span>
          </span>
        </label>
        <label className="group block">
          <span className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("secondaryColorLabel")}</span>
          <span className="mt-2 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-2 shadow-sm transition group-hover:border-primary/20 dark:border-white/10 dark:bg-white/5">
            <input type="color" value={config.secondaryColor} onChange={(event) => setConfig((current) => ({ ...current, secondaryColor: event.target.value }))} className="h-9 w-9 cursor-pointer appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0" />
            <span className="font-mono text-xs font-medium text-ink/60 dark:text-white/60">{config.secondaryColor}</span>
          </span>
        </label>
        <label className="group block">
          <span className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("accentColorLabel")}</span>
          <span className="mt-2 flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-2 shadow-sm transition group-hover:border-primary/20 dark:border-white/10 dark:bg-white/5">
            <input type="color" value={config.accentColor} onChange={(event) => setConfig((current) => ({ ...current, accentColor: event.target.value }))} className="h-9 w-9 cursor-pointer appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0" />
            <span className="font-mono text-xs font-medium text-ink/60 dark:text-white/60">{config.accentColor}</span>
          </span>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-[20px] border border-ink/10 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:border-white/10">
        <div className="grid grid-cols-2 divide-x divide-ink/10 dark:divide-white/10">
          <div className="bg-[#0f1225] p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40"><span className="h-2 w-2 rounded-full bg-white shadow-sm ring-2 ring-white/20" />{t("lightPreview")}</p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur">
              {(config.brandLogoLight || config.brandLogo) ? <img src={config.brandLogoLight || config.brandLogo} alt={t("logoLightLabel")} className="h-8 w-auto rounded-lg object-contain" /> : <span className="font-bold text-white">KWL-NEXUS</span>}
              <span className="ml-auto hidden rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10 sm:inline">Logo</span>
            </div>
            {(config.brandBannerLight || config.brandBanner) ? <img src={config.brandBannerLight || config.brandBanner} alt={t("bannerLightLabel")} className="mt-4 h-24 w-full rounded-2xl border border-white/10 object-cover shadow-sm" /> : <div className="mt-4 grid h-24 place-items-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 text-xs font-medium text-white/30">{t("noBanner")}</div>}
          </div>
            
          <div className="bg-[#0f1225] p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white"><span className="h-2 w-2 rounded-full bg-white shadow-sm ring-2 ring-white/20" />{t("darkPreview")}</p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
              {(config.brandLogoDark || config.brandLogo) ? <img src={config.brandLogoDark || config.brandLogo} alt={t("logoDarkLabel")} className="h-9 w-auto rounded-lg object-contain" /> : <span className="font-bold text-white">KWL-NEXUS</span>}
              <span className="ml-auto hidden rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/70 sm:inline">Logo</span>
            </div>
            {(config.brandBannerDark || config.brandBanner) ? <img src={config.brandBannerDark || config.brandBanner} alt={t("bannerDarkLabel")} className="mt-3 h-24 w-full rounded-2xl border border-white/15 object-cover shadow-md" /> : <div className="mt-3 grid h-24 place-items-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5 text-xs font-medium text-white/40">{t("noBanner")}</div>}
          </div>
        </div>
        <div className="bg-gradient-to-r from-[var(--brand-primary,#6C63FF)] to-[var(--brand-secondary,#00D4FF)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {(config.brandLogoLight || config.brandLogoDark || config.brandLogo) && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold text-ink shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t("logoCheck")}</span>}
              {(config.brandBannerLight || config.brandBannerDark || config.brandBanner) && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold text-ink shadow-sm"><span className="h-2 w-2 rounded-full bg-sky-500" />{t("bannerCheck")}</span>}
            </div>
            <span className="text-xs font-medium text-white/80">Live • No code change</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={() => void saveConfig()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50">
          {saved ? <Check size={16} /> : <Palette size={16} />}
          {saving ? t("saving") : saved ? t("saved") : t("saveBranding")}
        </button>
        {saved && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{t("brandingUpdatedMsg")}</span>}
      </div>
    </section>
  );
}
