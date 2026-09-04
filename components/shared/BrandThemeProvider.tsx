"use client";

import { createContext, useContext, useEffect, useState } from "react";

type BrandConfig = {
  brandName: string;
  brandLogo: string;
  brandLogoLight: string;
  brandLogoDark: string;
  brandIcon: string;
  brandIconLight: string;
  brandIconDark: string;
  brandFavicon: string;
  brandBanner: string;
  brandBannerLight: string;
  brandBannerDark: string;
  brandAppIcon: string;
  ogImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const defaultConfig: BrandConfig = {
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

const BrandContext = createContext<{ config: BrandConfig; setConfig: (value: BrandConfig) => void }>({
  config: defaultConfig,
  setConfig: () => undefined,
});

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BrandConfig>(defaultConfig);

  function load() {
    fetch("/api/system-config")
      .then((res) => (res.ok ? res.json() : { data: defaultConfig }))
      .then((payload) => setConfig((prev) => ({ ...prev, ...(payload.data ?? {}) } as BrandConfig)))
      .catch(() => setConfig(defaultConfig));
  }

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("branding-updated", h);
    window.addEventListener("focus", h);
    return () => {
      window.removeEventListener("branding-updated", h);
      window.removeEventListener("focus", h);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", config.primaryColor);
    document.documentElement.style.setProperty("--brand-secondary", config.secondaryColor);
    document.documentElement.style.setProperty("--brand-ink", config.accentColor);
    document.title = config.brandName ? `${config.brandName} Store` : "KWL-NEXUS Store";
    // Live favicon / app-icon update without code change
    try {
      if (config.brandFavicon) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = config.brandFavicon;
      }
      if (config.ogImage) {
        let meta = document.querySelector("meta[property='og:image']") as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("property", "og:image");
          document.head.appendChild(meta);
        }
        meta.content = config.ogImage;
      }
    } catch {}
  }, [config]);

  return <BrandContext.Provider value={{ config, setConfig }}>{children}</BrandContext.Provider>;
}

export function useBrandTheme() {
  return useContext(BrandContext);
}
