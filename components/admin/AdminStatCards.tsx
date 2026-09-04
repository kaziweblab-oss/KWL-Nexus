"use client";

import { ArrowDownToLine, Boxes, CreditCard, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Stat = { label: string; value: string; delta: string; icon: typeof Boxes };

export function AdminStatCards() {
  const { t } = useLanguage();
  const fallback: Stat[] = [
    { label: t("totalAppsLabel"), value: "0", delta: t("thisMonthDelta", { count: "0" }), icon: Boxes },
    { label: t("usersLabel"), value: "0", delta: t("thisMonthDelta", { count: "0" }), icon: Users },
    { label: t("revenueLabel"), value: "$0", delta: t("thisMonthDelta", { count: "0" }), icon: CreditCard },
    { label: t("downloadsLabel"), value: "0", delta: t("thisMonthDelta", { count: "0" }), icon: ArrowDownToLine },
  ];
  const [stats, setStats] = useState<Stat[]>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard-stats", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled && j.data) {
          setStats([
            { label: t("totalAppsLabel"), value: j.data.totalApps.value, delta: j.data.totalApps.delta, icon: Boxes },
            { label: t("usersLabel"), value: j.data.users.value, delta: j.data.users.delta, icon: Users },
            { label: t("revenueLabel"), value: j.data.revenue.value, delta: j.data.revenue.delta, icon: CreditCard },
            { label: t("downloadsLabel"), value: j.data.downloads.value, delta: j.data.downloads.delta, icon: ArrowDownToLine },
          ]);
        }
      } catch {
        // keep fallback (0) — will show 0 until DB has data, no mock 600
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, delta, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/5 dark:bg-[#1d1d34]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink/50 dark:text-white/50">{label}</span>
            <Icon size={18} className="text-primary dark:text-secondary" />
          </div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-ink dark:text-white">{loading ? "—" : value}</p>
          <p className="mt-2 text-xs font-semibold text-[#159570] dark:text-emerald-400">{loading ? t("loading") : delta}</p>
        </div>
      ))}
    </div>
  );
}
