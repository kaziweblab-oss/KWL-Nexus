"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useBrandTheme } from "@/components/shared/BrandThemeProvider";

type Props = {
  variant?: "full" | "icon";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

// Theme-aware Brand Logo for KWL NEXUS — Blending mode
// Dark theme → dark logo/icon (blends with dark bg)
// Light theme → white logo/icon (blends with light bg)
export function BrandLogo({ variant = "full", size = "md", className = "" }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { config } = useBrandTheme();

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const dimensions =
    variant === "icon"
      ? size === "sm"
        ? { w: 32, h: 32 }
        : size === "lg"
          ? { w: 44, h: 44 }
          : size === "xs"
            ? { w: 20, h: 20 }
            : { w: 36, h: 36 }
      : size === "sm"
        ? { w: 150, h: 30 }
        : size === "lg"
          ? { w: 220, h: 44 }
          : { w: 185, h: 37 };

  // Use branding config if set (light/dark separate), otherwise fallback to static assets
  const iconForTheme = isDark ? config.brandIconDark || config.brandIcon : config.brandIconLight || config.brandIcon;
  const logoForTheme = isDark ? config.brandBannerDark || config.brandBanner : config.brandBannerLight || config.brandBanner;
  const hasCustomIcon = Boolean(iconForTheme);
  const hasCustomLogo = Boolean(logoForTheme);
  const src =
    variant === "icon"
      ? hasCustomIcon
        ? iconForTheme
        : isDark
          ? "/branding/icons/kwl-nexus-icon-dark.png"
          : "/branding/icons/kwl-nexus-icon-white.png"
      : hasCustomLogo
        ? logoForTheme
        : isDark
          ? "/branding/logos/kwl-nexus-logo-dark.svg"
          : "/branding/logos/kwl-nexus-logo-white.svg";

  // Avoid flash before mount - show light theme assets by default
  const defaultIcon = "/branding/icons/kwl-nexus-icon-white.png";
  const defaultLogo = "/branding/logos/kwl-nexus-logo-white.svg";
  const defaultForMountIcon = config.brandIconLight || config.brandIcon || defaultIcon;
  const defaultForMountLogo = config.brandBannerLight || config.brandBanner || defaultLogo;
  const imgSrc = mounted ? src : variant === "icon" ? defaultForMountIcon : defaultForMountLogo;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt="KWL NEXUS"
      width={dimensions.w}
      height={dimensions.h}
      className={`object-contain rounded-lg ${className}`}
      loading="eager"
    />
  );
}
