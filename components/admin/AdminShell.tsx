"use client";

import Link from "next/link";
import { Boxes, CreditCard, LayoutDashboard, MessageSquare, PhoneCall, PlayCircle, Settings, Users, ShieldCheck, FileText, DollarSign, Palette } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { LogoutIcon } from "@/components/ui/LogoutIcon";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useLanguage } from "@/components/shared/LanguageProvider";

const navigation = [
  { href: "/admin", labelKey: "adminNavOverview", icon: LayoutDashboard, superOnly: false },
  { href: "/admin/apps", labelKey: "adminNavApps", icon: Boxes, superOnly: false },
  { href: "/admin/pricing", labelKey: "adminNavPricing", icon: DollarSign, superOnly: false },
  { href: "/admin/contact", labelKey: "adminNavContact", icon: PhoneCall, superOnly: false },
  { href: "/admin/users", labelKey: "adminNavUsers", icon: Users, superOnly: false },
  { href: "/admin/feedbacks", labelKey: "adminNavFeedback", icon: MessageSquare, superOnly: false },
  { href: "/admin/apps/tutorials", labelKey: "adminNavTutorials", icon: PlayCircle, superOnly: false },
  { href: "/admin/payments", labelKey: "adminNavPayments", icon: CreditCard, superOnly: false },
  { href: "/admin/admins", labelKey: "adminNavAdmins", icon: ShieldCheck, superOnly: true },
  { href: "/admin/branding", labelKey: "adminNavBranding", icon: Palette, superOnly: false },
  { href: "/admin/guidelines", labelKey: "adminNavGuidelines", icon: FileText, superOnly: false },
  { href: "/admin/settings", labelKey: "adminNavSettings", icon: Settings, superOnly: false },
] as const;

// Admin pages share a dense navigation shell designed for repeated operations.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    if (!session?.user?.email) {
      setIsSuperAdmin(false);
      return;
    }
    fetch("/api/user/is-admin")
      .then((r) => r.json())
      .then((d) => {
        if (active) setIsSuperAdmin(Boolean(d?.isSuperAdmin));
      })
      .catch(() => {
        if (active) setIsSuperAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.email]);

  const visibleNav = navigation.filter((item) => !item.superOnly || isSuperAdmin);
  // Fix duplicate active: "/admin/apps" is prefix of "/admin/apps/tutorials" — pick longest match only
  const activeHref = (() => {
    const candidates = visibleNav.filter((v) => pathname === v.href || (v.href !== "/admin" && pathname.startsWith(v.href + "/")));
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.href.length > b.href.length ? a : b)).href;
  })();

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-[#f6f7fb] dark:bg-[#0f0f1e]">
      {/* Sidebar: sticky below header, scrollable internally, pushes up with footer (parent flex ends before Footer) */}
      <aside className="sticky top-[65px] z-20 hidden h-[calc(100vh-65px)] w-64 shrink-0 flex-col self-start overflow-y-auto overflow-x-hidden border-r border-ink/10 bg-[#f1f2f6] dark:border-white/5 dark:bg-[#1a1a2e] lg:flex [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
        <div className="flex-1 p-6">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <BrandLogo variant="full" size="sm" />
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/35">{t("controlPanel")}</p>
          <nav className="mt-4 space-y-1">
            {visibleNav.map(({ href, labelKey, icon: Icon }) => {
              const isActive = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition hover:translate-x-0.5 ${
                    isActive
                      ? "bg-white text-primary shadow-sm border border-[#6C63FF]/20 dark:bg-[#252a4a] dark:text-white dark:border-[#6C63FF]/30 dark:shadow-[0_2px_10px_rgba(108,99,255,0.2)]"
                      : "text-ink/60 hover:bg-white hover:text-primary hover:shadow-sm dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-secondary"
                  }`}
                >
                  <Icon size={17} />
                  {t(labelKey as never)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="sticky bottom-0 border-t border-ink/10 bg-white p-4 dark:border-white/5 dark:bg-[#1a1a2e]">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="group flex w-full items-center gap-3 rounded-xl border border-red-200 bg-white px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 hover:scale-[1.02] active:scale-95 transition dark:border-red-500/20 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogoutIcon width={17} height={17} /> {t("signOut")}
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
