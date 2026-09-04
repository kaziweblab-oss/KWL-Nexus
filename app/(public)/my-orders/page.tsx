"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShoppingBag, Clock3, CheckCircle2, XCircle, CreditCard, Calendar, Hash, ArrowLeft, Loader2, Trash2, Trash } from "lucide-react";
import { getApp } from "@/lib/data/apps";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Order = {
  _id: string;
  appId?: string;
  planId?: string;
  amount: number;
  currency?: string;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "bg-[#fff6dd] text-[#b77900] dark:bg-[#b77900]/20 dark:text-[#f5d78e] border-amber-200 dark:border-amber-500/20";
  if (s === "succeeded" || s === "approved" || s === "active" || s === "completed") return "bg-[#e5f8f1] text-[#159570] dark:bg-[#159570]/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20";
  if (s === "failed" || s === "rejected" || s === "cancelled") return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-500/20";
  return "bg-ink/5 text-ink/60 dark:bg-white/10 dark:text-white/60 border-ink/10 dark:border-white/10";
}

function statusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return <Clock3 size={14} className="text-[#b77900]" />;
  if (s === "succeeded" || s === "approved") return <CheckCircle2 size={14} className="text-emerald-600" />;
  if (s === "failed" || s === "rejected") return <XCircle size={14} className="text-red-500" />;
  return <CreditCard size={14} className="text-ink/40" />;
}

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/payment/history", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || t("failedLoadOrders"));
        const data = Array.isArray(j.data) ? j.data : [];
        // normalize // appId may be stored as appId or not, try to recover from notes/plan
        setOrders(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("failedLoadOrders"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status]);

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/payment/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || t("failedRemoveOrder"));
      setOrders((prev) => prev.filter((o) => o._id !== id));
      showToast(t("orderRemovedSuccess"), "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("failedRemoveOrder");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  }

  async function handleClearAll() {
    setIsClearing(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/history", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || t("failedClearOrders"));
      setOrders([]);
      showToast(t("allOrdersCleared"), "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("failedClearOrders");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsClearing(false);
      setConfirmClearAll(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <div className="flex items-center gap-3 text-ink/60 dark:text-white/60"><Loader2 size={18} className="animate-spin" /> {t("loadingOrders")}</div>
      </main>
    );
  }

  if (!session?.user?.email) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingBag size={28} /></div>
        <h1 className="mt-6 text-2xl font-bold text-ink dark:text-white">{t("signInToViewOrders")}</h1>
        <p className="mt-2 text-sm text-ink/60 dark:text-white/60">{t("ordersSignInDesc")}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50">
        <ArrowLeft size={16} /> {t("backToDashboard")}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("yourOrders")}</p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-bold tracking-tight text-ink dark:text-white"><ShoppingBag className="text-primary" /> {t("myOrders")}</h1>
          <p className="mt-2 text-ink/55 dark:text-white/60">{t("myOrdersDesc", { count: orders.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orders.length > 0 && (
            <button onClick={() => setConfirmClearAll(true)} disabled={isClearing} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 dark:border-red-500/20 dark:bg-white/5 dark:text-red-400 dark:hover:bg-red-500/10">
              {isClearing ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />} {t("clearAll")}
            </button>
          )}
          <Link href="/apps" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90">{t("browseApps")}</Link>
        </div>
      </div>

      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper dark:bg-white/5 text-ink/30 dark:text-white/30"><ShoppingBag /></div>
            <p className="mt-4 font-semibold text-ink dark:text-white">{t("noOrdersYet")}</p>
            <p className="mt-1 text-sm text-ink/50 dark:text-white/50">{t("noOrdersDesc")}</p>
            <Link href="/apps" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink">{t("exploreApps")}</Link>
          </div>
        ) : (
          <div className="divide-y divide-ink/10 dark:divide-white/10">
            {orders.map((o) => {
              const app = o.appId ? getApp(o.appId) : undefined;
              return (
                <div key={o._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-paper/50 dark:hover:bg-white/[0.03]">
                  <div className="flex gap-4 min-w-0">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg text-white" style={{ backgroundColor: app?.accent ?? "#6C63FF" }}>{app?.icon ?? "◈"}</div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink dark:text-white">
                        {app?.name ?? o.appId ?? "Order"} <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge(o.status)}`}>{statusIcon(o.status)} {o.status}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink/50 dark:text-white/50">
                        <span className="flex items-center gap-1"><Hash size={12} /> {o.transactionId ?? "—"}</span>
                        <span className="flex items-center gap-1 capitalize"><CreditCard size={12} /> {o.paymentMethod ?? "—"}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(o.createdAt).toLocaleString()}</span>
                      </p>
                      {o.notes && <p className="mt-1 text-xs text-ink/60 dark:text-white/60 line-clamp-2">{o.notes}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink dark:text-white">{o.currency ?? "BDT"} {o.amount}</p>
                      <p className="text-xs text-ink/40 dark:text-white/40">ID: {o._id.slice(-6)}</p>
                    </div>
                    {o.appId && <Link href={`/apps/${o.appId}`} className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white">{t("viewApp")}</Link>}
                    <button
                      onClick={() => setConfirmRemoveId(o._id)}
                      disabled={removingId === o._id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white transition"
                      title={t("remove")}
                    >
                      {removingId === o._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} {t("remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-ink/40 dark:text-white/30">{t("orderStatusUpdates")} <Link href="/dashboard" className="underline">{t("backToDashboard")}</Link>.</p>

      {/* Remove confirmation — toast-style modal (replaces browser confirm) */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setConfirmRemoveId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Trash2 size={18} /></div>
              <div className="flex-1">
                <h3 className="font-bold text-ink dark:text-white">{t("confirmRemoveOrder")}</h3>
                <p className="mt-1 text-sm leading-5 text-ink/60 dark:text-white/60">{t("confirmRemoveOrderDesc")}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmRemoveId(null)} disabled={!!removingId} className="flex-1 rounded-full border border-ink/10 bg-white py-2.5 text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-50">{t("cancel")}</button>
              <button onClick={() => handleRemove(confirmRemoveId)} disabled={!!removingId} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                {removingId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t("remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All confirmation — toast-style */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setConfirmClearAll(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"><Trash size={18} /></div>
              <div className="flex-1">
                <h3 className="font-bold text-ink dark:text-white">{t("confirmClearAll")}</h3>
                <p className="mt-1 text-sm leading-5 text-ink/60 dark:text-white/60">{t("confirmClearAllDesc", { count: orders.length })}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmClearAll(false)} disabled={isClearing} className="flex-1 rounded-full border border-ink/10 bg-white py-2.5 text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-50">{t("cancel")}</button>
              <button onClick={handleClearAll} disabled={isClearing} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                {isClearing ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />} {t("clearAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
