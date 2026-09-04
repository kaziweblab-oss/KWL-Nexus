"use client";

import Link from "next/link";
import { LogIn, UserRound, Sun, LayoutDashboard, Settings, LayoutGrid, ChevronDown, X, Bell, ShoppingBag } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { LogoutIcon } from "@/components/ui/LogoutIcon";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { BrandLogo } from "./BrandLogo";
import { NotificationBell } from "./NotificationBell";

const ThemeToggle = dynamic(() => import("./ThemeToggle").then((mod) => mod.ThemeToggle), {
  ssr: false,
  loading: () => (
    <span suppressHydrationWarning className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 text-ink/60">
      <Sun size={17} suppressHydrationWarning />
    </span>
  ),
});

type NavItem = {
  key: string;
  href: string;
  labelKey: Parameters<ReturnType<typeof useLanguage>["t"]>[0];
  icon?: React.ReactNode;
  adminOnly?: boolean;
};

function UserMenu({
  session,
  isAdmin,
  imgError,
  setImgError,
  navItems,
  collapsedNavItems,
  showNavInDropdown,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  isAdmin: boolean;
  imgError: boolean;
  setImgError: (v: boolean) => void;
  navItems: React.ReactNode;
  collapsedNavItems: React.ReactNode;
  showNavInDropdown: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [mobileNotifs, setMobileNotifs] = useState<Array<{ _id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  };
  useEffect(() => {
    if (!open || !session?.user?.email) return;
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (Array.isArray(j.data)) setMobileNotifs(j.data.slice(0, 4)); })
      .catch(() => {});
  }, [open, session?.user?.email]);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  // lock background scroll, only window scrolls; close on outside scroll
  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target instanceof Node && (ref.current?.contains(target) || menuRef.current?.contains(target))) return;
      // scroll outside window -> close, background may scroll after close
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1e2030] p-1 pr-3 text-white shadow-sm transition hover:bg-[#2a2d45] hover:border-white/15"
      >
        <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          {session.user?.image && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt={session.user.name ?? "Profile"} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <UserRound size={16} className="text-white/80" />
          )}
        </span>
        <span className="max-w-[90px] truncate text-sm font-semibold text-white sm:max-w-[120px] lg:max-w-[200px] xl:max-w-[260px]">{session.user?.name ?? session.user?.email ?? "Account"}</span>
        <ChevronDown size={14} className={`shrink-0 text-white/50 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-white/40 backdrop-blur-md dark:bg-black/50 dark:backdrop-blur-md sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div ref={menuRef} style={{ top: menuPosition.top, right: menuPosition.right }} className="profile-scrollbar fixed z-[9999] max-h-[75vh] w-64 overflow-y-auto overscroll-contain rounded-2xl border border-ink/10 bg-white shadow-[0_18px_55px_rgba(71,94,180,0.28),0_8px_24px_rgba(0,212,255,0.14)] [scrollbar-color:#46436f_transparent] [scrollbar-width:thin] dark:border-white/10 dark:bg-[#1a1a2e] dark:shadow-[0_18px_55px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,212,255,0.12)] dark:[scrollbar-color:#17464d_transparent] sm:max-h-[80vh]">
          <div className="[direction:ltr]">
          <div className="flex justify-end border-b border-ink/5 p-2 dark:border-white/10">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeProfileMenu")}
              className="grid h-7 w-7 place-items-center rounded-full border border-transparent bg-ink/5 text-ink/55 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:border-red-400 dark:hover:bg-red-400/10 dark:hover:text-red-400"
            >
              <X size={16} />
            </button>
          </div>
          {/* Small screen theme + language inside window - flag hidden, theme like image2 but original colors */}
          <div className="flex items-center justify-between gap-2 border-b border-ink/5 bg-paper/30 p-2 dark:bg-white/[0.04] sm:hidden">
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <LanguageSwitcher hideFlag />
            </span>
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <ThemeToggle forceShowLabel />
            </span>
          </div>
          {/* Mobile notifications inside profile window - visible only on small screens */}
          <div className="border-b border-ink/5 p-2 dark:border-white/10 sm:hidden">
            <div className="flex items-center justify-between px-3 py-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/40 dark:text-white/40"><Bell size={12}/> {t("notifications")} {mobileNotifs.filter((n) => !n.read).length > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{mobileNotifs.filter((n) => !n.read).length}</span>}</p>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</Link>
            </div>
            <div className="mt-2 max-h-[160px] overflow-y-auto rounded-xl border border-ink/10 bg-paper/50 dark:border-white/10 dark:bg-white/5">
              {mobileNotifs.length === 0 ? <p className="p-4 text-center text-xs text-ink/50 dark:text-white/50">{t("noNotificationsShort")}</p> : mobileNotifs.map((n) => (
                <div key={n._id} className="flex gap-2 border-b border-ink/5 p-3 last:border-0 dark:border-white/5">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink dark:text-white">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink/60 dark:text-white/60">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showNavInDropdown && (
            <div className="border-b border-ink/5 p-2">
              <p className="mb-2 border-b border-ink/10 px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-ink/40 dark:border-white/10 dark:text-white/40">
                {t("navigation")}
              </p>
              <nav className="flex flex-col" role="navigation" aria-label="Main navigation" onClick={() => setOpen(false)}>
                {collapsedNavItems}
              </nav>
            </div>
          )}
          {!showNavInDropdown && navItems && (
            <div className="border-b border-ink/5 p-2" onClick={() => setOpen(false)}>
              {navItems}
            </div>
          )}
          <div className="border-b border-ink/5 bg-paper/50 p-4 dark:bg-white/5">
            <p className="text-sm font-bold text-ink dark:text-white truncate">{session.user?.name ?? "Account"}</p>
            <p className="truncate text-xs text-ink/50 dark:text-white/50">{session.user?.email}</p>
          </div>
          <div className="p-2">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper dark:text-white/70 dark:hover:bg-white/10">
              <LayoutGrid size={16} /> {t("dashboard")}
            </Link>
            <Link href="/my-orders" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper dark:text-white/70 dark:hover:bg-white/10">
              <ShoppingBag size={16} /> {t("myOrders")}
            </Link>
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper dark:text-white/70 dark:hover:bg-white/10">
                <LayoutDashboard size={16} /> {t("navAdminDashboard")}
              </Link>
            )}
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper dark:text-white/70 dark:hover:bg-white/10">
              <Settings size={16} /> {t("settings")}
            </Link>
            <div className="my-2 h-px bg-ink/5 dark:bg-white/5" />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <LogoutIcon width={16} height={16} /> {t("signOut")}
            </button>
          </div>
          </div>
          </div>
        </>, document.body
      )}
    </div>
  );
}

export function Navbar() {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith("/login");
  const { data: session } = useSession();
  const [imgError, setImgError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [session?.user?.image]);

  useEffect(() => {
    let active = true;
    if (!session?.user?.email) {
      setIsAdmin(false);
      return;
    }
    fetch("/api/user/is-admin")
      .then((res) => res.json())
      .then((data) => {
        if (active) setIsAdmin(Boolean(data?.isAdmin));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.email]);

  const allNavItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { key: "home", href: "/", labelKey: "navHome" },
      { key: "apps", href: "/apps", labelKey: "navApps" },
    ];
    if (isAdmin) {
      items.push({ key: "developers", href: "/developers", labelKey: "navDevelopers", adminOnly: true });
    }
    return items;
  }, [isAdmin]);

  const profileNavItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAdmin) {
      items.push({ key: "docs", href: "/docs", labelKey: "navDocumentation" });
      items.push({ key: "admin", href: "/admin", labelKey: "navAdminDashboard", icon: <LayoutDashboard size={16} />, adminOnly: true });
    }
    return items;
  }, [isAdmin]);

  const navLinkClass = (path: string) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm transition ${
      isDark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-ink"
    } ${pathname === path ? (isDark ? "bg-white/10 text-white" : "bg-slate-900 text-white") : ""}`;

  const navDropdownClass = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-paper dark:text-white/70 dark:hover:bg-white/10 w-full";

  const profileMenuNavItems = [...allNavItems, ...profileNavItems].map((item) => (
    <Link
      key={item.key}
      className={navDropdownClass}
      href={item.href}
      tabIndex={0}
    >
      {item.icon}
      {t(item.labelKey)}
    </Link>
  ));

  return (
    <header suppressHydrationWarning className={`sticky top-0 z-50 border-b backdrop-blur-2xl ${isDark ? "border-white/10 bg-[#0f0f1e]/90" : "border-ink/10 bg-white/90"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center transition hover:opacity-80">
          <BrandLogo variant="full" size="sm" className="hidden sm:block" />
          <BrandLogo variant="full" size="sm" className="sm:hidden" />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden text-sm font-semibold lg:flex xl:gap-2"
          aria-label="Main navigation"
        >
          {allNavItems.map((item) => (
            <Link
              key={item.key}
              className={navLinkClass(item.href)}
              href={item.href}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5" suppressHydrationWarning>
          <span className="hidden sm:block">
            <NotificationBell />
          </span>
          <span className="hidden sm:block">
            <LanguageSwitcher />
          </span>
          <span suppressHydrationWarning className="hidden shrink-0 sm:block">
            <ThemeToggle />
          </span>

          {session ? (
            <UserMenu
              session={session}
              isAdmin={isAdmin}
              imgError={imgError}
              setImgError={setImgError}
              navItems={profileMenuNavItems}
              collapsedNavItems={profileMenuNavItems}
              showNavInDropdown
            />
          ) : !isLoginPage ? (
            <>
              <Link
                suppressHydrationWarning
                href="/login"
                className={`hidden md:flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold border transition hover:-translate-y-0.5 ${isDark ? "text-white border-white/20 hover:border-secondary hover:text-secondary" : "text-slate-800 border-slate-300 bg-white hover:border-primary hover:text-primary hover:shadow-sm"}`}
              >
                <LogIn size={16} suppressHydrationWarning /> {t("login")}
              </Link>
              <Link
                suppressHydrationWarning
                href="/login?mode=signup"
                className="hidden md:flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 dark:bg-secondary dark:text-ink"
              >
                {t("signUp")}
              </Link>
            </>
          ) : null}
        </div>

      </div>
    </header>
  );
}
