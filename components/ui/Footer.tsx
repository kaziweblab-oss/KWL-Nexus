"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Globe, LayoutDashboard, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { FaFacebookF, FaGithub, FaInstagram, FaLinkedinIn, FaTelegram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { BrandLogo } from "@/components/ui/BrandLogo";

type ContactItem = {
  _id?: string;
  id?: string;
  type: string;
  value: string;
  label: string;
  icon: string;
  section?: "getInTouch" | "social";
  isActive?: boolean;
  order?: number;
};

const socialIconMap: Record<string, IconType> = {
  youtube: FaYoutube,
  facebook: FaFacebookF,
  github: FaGithub,
  twitter: FaXTwitter,
  x: FaXTwitter,
  instagram: FaInstagram,
  telegram: FaTelegram,
  linkedin: FaLinkedinIn,
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  default: Globe,
};

const contactIconMap: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  facebook: Globe,
};

const fallbackSocialItems: ContactItem[] = [
  { id: "fb-default", type: "facebook", value: "https://facebook.com", label: "Facebook", icon: "facebook", section: "social", isActive: true, order: 0 },
  { id: "github-default", type: "github", value: "https://github.com", label: "GitHub", icon: "github", section: "social", isActive: true, order: 1 },
  { id: "instagram-default", type: "instagram", value: "https://instagram.com", label: "Instagram", icon: "instagram", section: "social", isActive: true, order: 2 },
  { id: "telegram-default", type: "telegram", value: "https://t.me", label: "Telegram", icon: "telegram", section: "social", isActive: true, order: 3 },
];

function buildHref(item: ContactItem): string {
  const value = item.value.trim();
  switch (item.type) {
    case "email":     return `mailto:${value}`;
    case "phone":     return `tel:${value.replace(/\s+/g, "")}`;
    case "whatsapp":  return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
    case "facebook":  return value.startsWith("http") ? value : `https://${value}`;
    case "youtube":   return value.startsWith("http") ? value : `https://${value}`;
    case "github":    return value.startsWith("http") ? value : `https://${value}`;
    default:          return value.startsWith("http") ? value : `https://${value}`;
  }
}

export function Footer() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);

  useEffect(() => {
    let active = true;
    if (!session?.user?.email) {
      setIsAdmin(false);
      return;
    }
    fetch("/api/user/is-admin")
      .then((r) => r.json())
      .then((d) => {
        if (active) setIsAdmin(Boolean(d?.isAdmin));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.email]);

  useEffect(() => {
    fetch("/api/contact")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((payload) => setContacts(Array.isArray(payload.data) ? payload.data : []))
      .catch(() => setContacts([]));
  }, []);

  const touchItems = useMemo(
    () =>
      contacts
        .filter((c) => {
          if (c.isActive === false) return false;
          if (c.section) return c.section === "getInTouch";
          return ["email", "phone", "whatsapp", "facebook"].includes(c.type);
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [contacts]
  );

  const socialItems = useMemo(
    () => {
      const items = contacts
        .filter((c) => {
          if (c.isActive === false) return false;
          if (c.section) return c.section === "social";
          return ["youtube", "facebook", "github", "twitter", "instagram", "telegram"].includes(c.type);
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      return items.length > 0 ? items : fallbackSocialItems;
    },
    [contacts]
  );

  const admin = isAdmin;

  return (
    <footer
      suppressHydrationWarning
      className="border-t border-ink/10 bg-[#f1f2f6] backdrop-blur-xl dark:border-white/5 dark:bg-[#0b0b1e]/95"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link href="/" className="flex items-center justify-center gap-3 transition hover:opacity-80 lg:justify-start">
              <BrandLogo variant="full" size="md" className="mx-auto lg:mx-0" />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink/60 dark:text-white/50 text-center lg:text-left">{t("footerTagline")}</p>
          </div>

          {/* Explore */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50 dark:text-white/40">{t("footerExplore")}</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link href="/apps" className="flex items-center gap-2 text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5"><Boxes size={14} /> {t("navApps")}</Link>
              <Link href="/dashboard" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("workspace")}</Link>
              <Link href="/pricing" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("navPricing")}</Link>
              <Link href="/apps" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("allProducts")}</Link>
            </div>
          </div>

          {/* Company + Admin */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50 dark:text-white/40">{t("footerCompany")}</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              {admin && (
                <>
                  <Link href="/developers" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("navDevelopers")}</Link>
                  <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary dark:bg-white dark:text-ink transition hover:scale-105 dark:hover:bg-white/90"><LayoutDashboard size={12} /> {t("navAdminDashboard")}</Link>
                  <Link href="/admin/admins" className="flex items-center gap-1.5 text-ink/70 hover:text-primary dark:text-white/60 transition hover:translate-x-0.5"><ShieldCheck size={14} /> Admins</Link>
                </>
              )}
              <Link href="/privacy" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("privacyPolicy")}</Link>
              <Link href="/terms" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">{t("terms")}</Link>
              {admin && <Link href="/docs" className="text-ink/70 hover:text-primary dark:text-white/60 dark:hover:text-secondary transition hover:translate-x-0.5">Docs</Link>}
            </div>
          </div>

          {/* Get in Touch */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50 dark:text-white/40">{t("footerGetInTouch")}</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              {touchItems.map((item) => {
                const Icon = contactIconMap[item.type] ?? Globe;
                const isDirectContact = item.type === "email" || item.type === "phone";
                return (
                  <Link
                    key={item._id ?? item.id ?? `${item.type}-${item.value}`}
                    href={buildHref(item)}
                    target={isDirectContact ? undefined : "_blank"}
                    rel={isDirectContact ? undefined : "noreferrer"}
                    className="flex items-center gap-2 text-ink/70 transition hover:translate-x-0.5 hover:text-primary dark:text-white/60 dark:hover:text-secondary"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center"><Icon size={14} /></span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-ink/10 pt-6 dark:border-white/5">
          {socialItems.length > 0 && (
            <div className="mb-6 flex items-center justify-center gap-4 sm:justify-start">
              {socialItems.map((item) => {
                const iconKey = item.icon?.toLowerCase() ?? item.type;
                const Icon = socialIconMap[iconKey] ?? socialIconMap[item.type] ?? socialIconMap.default;
                return (
                  <Link
                    key={item._id ?? item.id ?? `${item.type}-${item.value}`}
                    href={buildHref(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white/60 text-ink/60 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:border-secondary dark:hover:text-secondary"
                  >
                    <Icon size={17} />
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex flex-col items-center justify-center gap-3 text-xs font-medium text-ink/60 dark:text-white/30 sm:flex-row">
            <span className="flex items-center justify-center gap-2 text-center">
              © 2026 KWL NEXUS. A Product of Kazi Web Lab (KWL)
              <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <img src="/branding/icons/kwl-nexus-icon-white.png" alt="" className="h-full w-full object-contain dark:hidden" />
                <img src="/branding/icons/kwl-nexus-icon-dark.png" alt="" className="hidden h-full w-full object-contain dark:block" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
