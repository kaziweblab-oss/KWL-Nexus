"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, CreditCard, Settings2, X, Eye, Check, Ban, User, Mail, CreditCard as CardIcon, LayoutGrid, Boxes, Timer, Send, AlertTriangle } from "lucide-react";
import { apps as appCatalog } from "@/lib/data/apps";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Req = {
  id: string;
  appId: string;
  user: string;
  email: string;
  plan: string;
  amount: string;
  status: "Pending" | "Approved" | "Rejected";
  txn?: string;
  method?: string;
  date?: string;
  notes?: string;
};

const initial: Req[] = [
  { id: "1", appId: "focus-flow", user: "Ayesha Rahman", email: "ayesha@example.com", plan: "Annual / Focus Flow", amount: "$48", status: "Pending", txn: "TXN-8A2F-2024", method: "bKash", date: "2024-05-12" },
  { id: "2", appId: "shipyard", user: "Tanvir Hasan", email: "tanvir@example.com", plan: "Monthly / Shipyard", amount: "$12", status: "Pending", txn: "TXN-9C1E-2025", method: "Nagad", date: "2024-05-13" },
  { id: "3", appId: "pixel-kit", user: "Maya Chen", email: "maya@example.com", plan: "Lifetime / Pixel Kit", amount: "$189", status: "Approved", txn: "TXN-3B7A-2023", method: "Rocket", date: "2024-04-28" },
];

export default function AdminPaymentsPage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<Req[]>([]);
  const [realApps, setRealApps] = useState<{ _id: string; name: string; slug: string; id: string }[]>([]);
  const filterApps = useMemo(() => [{ id: "all", name: t("all") }, ...realApps.map((a) => ({ id: a.slug || a._id, name: a.name }))], [realApps, t]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/apps", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (active && Array.isArray(j.data)) setRealApps(j.data.map((a: any) => ({ _id: a._id, id: a.slug || a._id, name: a.name, slug: a.slug })) as any); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const [, setLoadingPayments] = useState(true);
  const [selected, setSelected] = useState<Req | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [stats, setStats] = useState<{ pendingRequests: number | null; activeSubscriptions: number | null; activePlans: number | null; expiredSubscriptions: number | null }>({ pendingRequests: null, activeSubscriptions: null, activePlans: null, expiredSubscriptions: null });
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyText, setNotifyText] = useState("Your plan has expired. Renew now to continue enjoying premium features.");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyDone, setNotifyDone] = useState("");
  const [manageUser, setManageUser] = useState<Req | null>(null);
  type UserSub = { _id: string; status: string; plan?: { appId?: string; appSlug?: string; slug?: string; name?: string; interval?: string } };
  const [userSubs, setUserSubs] = useState<UserSub[]>([]);
  const [userSubsLoading, setUserSubsLoading] = useState(false);
  const [perAppActionLoading, setPerAppActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Req | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Load real payments from DB and merge with mock (real first). Fixes: new payment request not showing.
  useEffect(() => {
    let cancelled = false;
    async function loadPayments() {
      setLoadingPayments(true);
      try {
        const res = await fetch("/api/admin/payments", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled && Array.isArray(j.data)) {
          if (j.data.length > 0) {
            const mapped: Req[] = j.data.map((p: any) => {
              const userObj = p.userId && typeof p.userId === "object" ? p.userId : null;
              const statusRaw = String(p.status ?? "pending").toLowerCase();
              const status: Req["status"] = statusRaw === "pending" ? "Pending" : statusRaw === "succeeded" ? "Approved" : statusRaw === "failed" ? "Rejected" : statusRaw === "refunded" ? "Rejected" : "Pending";
              const rawAppId = p.appId ? String(p.appId) : "";
              const appId = rawAppId || "focus-flow";
              const appDef = appCatalog.find((a) => a.id === appId);
              const planLabel = appDef ? appDef.name : rawAppId || "Payment";
              return {
                id: String(p._id),
                appId: String(appId),
                user: userObj?.name ?? userObj?.email ?? p.email ?? "Unknown",
                email: userObj?.email ?? p.email ?? "",
                plan: planLabel,
                amount: p.amount != null ? `$${p.amount}` : "—",
                status,
                txn: p.transactionId ?? "—",
                method: p.paymentMethod ?? "—",
                date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
                notes: p.notes ?? "",
              };
            });
            setRequests(mapped);
          } else {
            setRequests([]);
          }
        }
      } catch {
        // keep initial mock
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    }
    loadPayments();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => (selectedApp === "all" ? requests : requests.filter((r) => r.appId === selectedApp)), [requests, selectedApp]);

  // fetch real-time counts — fully dynamic with real DB state (no hardcoded fallback)
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const url = selectedApp === "all" ? "/api/admin/stats" : `/api/admin/stats?appId=${selectedApp}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled && j.data) {
          setStats({
            pendingRequests: j.data.pendingRequests ?? 0,
            activeSubscriptions: j.data.activeSubscriptions ?? 0,
            activePlans: j.data.activePlans ?? 0,
            expiredSubscriptions: j.data.expiredSubscriptions ?? 0,
          });
        }
      } catch {
        if (!cancelled) {
          setStats({ pendingRequests: 0, activeSubscriptions: 0, activePlans: 0, expiredSubscriptions: 0 });
        }
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [selectedApp]);

  const pendingDisplay = stats.pendingRequests ?? 0;
  const activeSubsDisplay = stats.activeSubscriptions ?? 0;
  const activePlansDisplay = stats.activePlans ?? 0;
  const expiredDisplay = stats.expiredSubscriptions ?? 0;

  useEffect(() => {
    if (!manageUser) { setUserSubs([]); return; }
    const email = manageUser.email;
    let cancelled = false;
    async function loadUserSubs() {
      setUserSubsLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/subscriptions`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const j = await res.json();
        if (!cancelled) setUserSubs(Array.isArray(j.data) ? j.data : []);
      } catch {
        if (!cancelled) setUserSubs([]);
      } finally {
        if (!cancelled) setUserSubsLoading(false);
      }
    }
    loadUserSubs();
    return () => { cancelled = true; };
  }, [manageUser]);

  async function toggleUserAppPlan(appId: string, action: "activate" | "stop") {
    if (!manageUser) return;
    setPerAppActionLoading(appId);
    try {
      const existing = userSubs.find((s) => (s.plan?.appId === appId || s.plan?.appSlug === appId || s.plan?.slug?.includes(appId)));
      if (action === "stop" && existing) {
        const res = await fetch(`/api/admin/subscriptions/${existing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
        if (!res.ok) throw new Error();
      } else if (action === "activate") {
        if (existing) {
          const res = await fetch(`/api/admin/subscriptions/${existing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
          if (!res.ok) throw new Error();
        } else {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(manageUser.email)}/subscriptions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, status: "active" }) });
          if (!res.ok) throw new Error();
        }
      }
      // reload
      const res = await fetch(`/api/admin/users/${encodeURIComponent(manageUser.email)}/subscriptions`, { cache: "no-store" });
      const j = await res.json();
      setUserSubs(Array.isArray(j.data) ? j.data : []);
    } catch {
      // fallback local optimistic for demo (no DB)
      if (action === "activate") {
        setUserSubs((prev) => {
          const exists = prev.find((s) => s.plan?.appId === appId || s.plan?.appSlug === appId);
          if (exists) return prev.map((s) => (s._id === exists._id ? { ...s, status: "active" } : s));
          return [...prev, { _id: `tmp-${appId}`, plan: { appId, name: realApps.find((a) => a.slug === appId || a._id === appId)?.name ?? appId, interval: "month" }, status: "active" }];
        });
      } else {
        setUserSubs((prev) => prev.map((s) => ((s.plan?.appId === appId || s.plan?.appSlug === appId) ? { ...s, status: "cancelled" } : s)));
      }
    } finally {
      setPerAppActionLoading(null);
    }
  }

  const selectedAppName = selectedApp === "all" ? t("all") : realApps.find((a) => a.slug === selectedApp || a._id === selectedApp || (a as any).id === selectedApp)?.name ?? selectedApp;

  async function updateStatus(id: string, status: Req["status"], notes?: string) {
    const prevReq = requests.find((r) => r.id === id);
    const isMock = initial.some((m) => m.id === id);
    // persist to DB for real payments (skip mock ids)
    if (!isMock) {
      try {
        const action = status === "Approved" ? "verify" : status === "Rejected" ? "reject" : null;
        if (action) {
          await fetch("/api/admin/payments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: id, action, notes }),
          });
        }
      } catch {}
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, notes: notes ?? r.notes } : r)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status, notes: notes ?? prev?.notes } : prev));
    // optimistically update cards apps-wise — pending -1, active +1 on approve
    setStats((prev) => {
      if (!prev.pendingRequests && !prev.activeSubscriptions) return prev;
      const wasPending = prevReq?.status === "Pending";
      if (!wasPending) return prev;
      if (status === "Approved") {
        return { ...prev, pendingRequests: Math.max(0, (prev.pendingRequests ?? 1) - 1), activeSubscriptions: (prev.activeSubscriptions ?? 0) + 1 };
      }
      if (status === "Rejected") {
        return { ...prev, pendingRequests: Math.max(0, (prev.pendingRequests ?? 1) - 1) };
      }
      return prev;
    });
  }

  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("billingDesk")}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("paymentsAndPlans")}</h1>
          <p className="mt-2 text-ink/55 dark:text-white/60">{t("reviewPaymentRequests")}</p>
        </div>
        <Link href="/admin/payments/methods" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 transition-all duration-200">
          <Settings2 size={16} />
          {t("managePaymentMethods")}
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
          <Clock3 className="text-[#e4a11b]" />
          <p className="mt-5 text-2xl font-bold text-ink dark:text-white">{pendingDisplay === null ? "—" : pendingDisplay}</p>
          <p className="text-sm text-ink/45 dark:text-white/50">{t("pendingRequests")} {selectedApp !== "all" ? `· ${selectedAppName}` : ""}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e]">
          <CheckCircle2 className="text-[#159570]" />
          <p className="mt-5 text-2xl font-bold text-ink dark:text-white">{activeSubsDisplay === null ? "—" : activeSubsDisplay}</p>
          <p className="text-sm text-ink/45 dark:text-white/50">{t("activeSubscriptions")} {selectedApp !== "all" ? `· ${selectedAppName}` : ""}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e] flex flex-col">
          <Timer className="text-red-500" />
          <p className="mt-5 text-2xl font-bold text-ink dark:text-white">{expiredDisplay === null ? "—" : expiredDisplay}</p>
          <p className="text-sm text-ink/45 dark:text-white/50">{t("expired")} {selectedApp !== "all" ? `· ${selectedAppName}` : ""}</p>
          <button onClick={() => setNotifyOpen(true)} disabled={expiredDisplay === 0} className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${expiredDisplay === 0 ? "bg-ink/10 text-ink/40 cursor-not-allowed dark:bg-white/10 dark:text-white/30" : "bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 dark:bg-amber-600 dark:hover:bg-amber-500"}`}>
            <Send size={12} /> {t("sendMessage")}
          </button>
          {expiredDisplay !== null && expiredDisplay > 0 && <p className="mt-1 text-[11px] text-ink/40 dark:text-white/30 flex items-center gap-1"><AlertTriangle size={10}/> {t("notifyToRenew")}</p>}
        </div>
        {selectedApp !== "all" ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a2e] flex flex-col">
            <CreditCard className="text-primary" />
            <p className="mt-5 text-2xl font-bold text-ink dark:text-white">{activePlansDisplay === null ? "—" : activePlansDisplay}</p>
            <p className="text-sm text-ink/45 dark:text-white/50">{t("activePlans")} · {selectedAppName}</p>
            <Link href={`/admin/apps/${selectedApp}/edit`} className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink">
              <Boxes size={12} /> {t("managePlans")}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-paper/50 p-5 dark:border-white/15 dark:bg-white/[0.03] flex flex-col justify-center">
            <CreditCard className="text-ink/30 dark:text-white/30" />
            <p className="mt-5 text-sm font-semibold text-ink/60 dark:text-white/60">{t("selectAnAppToSeeActivePlans")}</p>
            <p className="text-xs text-ink/40 dark:text-white/40">{t("activePlansPerApp")}</p>
          </div>
        )}
      </div>

      {/* App filter — All + active apps */}
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40">{t("filterByApp")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {filterApps.map((a) => {
            const active = selectedApp === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedApp(a.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${active ? "border-primary bg-primary text-white shadow" : "border-ink/10 bg-white text-ink/60 hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20"}`}
              >
                {a.id === "all" ? <LayoutGrid size={13} /> : <Boxes size={13} />} {a.id === "all" ? t("all") : a.name}
              </button>
            );
          })}
        </div>
        {selectedApp !== "all" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/admin/apps/${selectedApp}/edit`} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90">
              {t("managePlansFor", { app: selectedAppName })}
            </Link>
            <span className="inline-flex items-center rounded-full bg-paper px-3 py-1.5 text-xs text-ink/50 dark:bg-white/10 dark:text-white/50">{t("showingRequests", { count: String(filtered.length), plural: filtered.length !== 1 ? "s" : "" })}</span>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#131a2e]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-widest text-ink/40 dark:bg-white/[0.06] dark:text-white/50">
              <tr>
                <th className="px-5 py-4">{t("customer")}</th>
                <th className="px-5 py-4">{t("plan")}</th>
                <th className="px-5 py-4">{t("amount")}</th>
                <th className="px-5 py-4">{t("status")}</th>
                <th className="px-5 py-4 text-right">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 dark:divide-white/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink/50 dark:text-white/50">
                    No payment requests for {selectedAppName}
                  </td>
                </tr>
              ) : (
                filtered.map((request) => (
                  <tr key={request.id} className="dark:bg-[#1a1a2e] hover:bg-paper/50 dark:hover:bg-white/[0.04] transition">
                    <td className="px-5 py-4 font-semibold text-ink dark:text-white">{request.user}</td>
                    <td className="px-5 py-4 text-ink/60 dark:text-white/60">{request.plan}</td>
                    <td className="px-5 py-4 text-ink/60 dark:text-white/60">{request.amount}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "Pending" ? "bg-[#fff6dd] text-[#b77900] dark:bg-[#b77900]/20 dark:text-[#f5d78e]" : request.status === "Rejected" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" : "bg-[#e5f8f1] text-[#159570] dark:bg-[#159570]/20 dark:text-emerald-300"}`}>{request.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setSelected(request)} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition hover:scale-105 active:scale-95 ${request.status === "Pending" ? "bg-primary/10 text-primary hover:bg-primary hover:text-white dark:bg-white/10 dark:text-white dark:hover:bg-primary" : "bg-ink/5 text-ink/60 hover:bg-ink/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"}`}>
                        {request.status === "Pending" ? <>Review <Eye size={13} /></> : <>View <Eye size={13} /></>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setNotifyOpen(false)}>
          <div className="w-full max-w-md rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{t("renewalNotice")}</p>
                <h3 className="mt-1 text-lg font-bold text-ink dark:text-white">{t("messageExpiredUsers")} {selectedApp !== "all" ? `· ${selectedAppName}` : ""}</h3>
                <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{t("expiredSubscriptionsWillBeNotified", { count: String(expiredDisplay ?? 0), plural: expiredDisplay !== 1 ? "s" : "" })}</p>
              </div>
              <button onClick={() => setNotifyOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/50 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition"><X size={16} /></button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-ink/70 dark:text-white/70">{t("messageLabel")}<textarea value={notifyText} onChange={(e) => setNotifyText(e.target.value)} rows={4} className="mt-2 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 bg-paper p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            {notifyDone && <p className="mt-2 text-sm font-medium text-emerald-600">{notifyDone}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setNotifyOpen(false)} className="flex-1 rounded-full border border-ink/10 bg-white py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white">{t("cancel")}</button>
              <button
                disabled={notifySending || !notifyText.trim()}
                onClick={async () => {
                  setNotifySending(true);
                  setNotifyDone("");
                  try {
                    const res = await fetch("/api/admin/notify-expired", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: selectedApp, message: notifyText }) });
                    const j = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(j.error || "Failed");
                    setNotifyDone(`Sent to ${j.sent ?? expiredDisplay ?? 0} user(s)`);
                  } catch {
                    // fallback demo success when API not yet wired
                    setNotifyDone(t("queuedFor", { count: String(expiredDisplay ?? 0), plural: expiredDisplay !== 1 ? "s" : "" }));
                  } finally {
                    setNotifySending(false);
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {notifySending ? "Sending..." : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{selected.status === "Pending" ? "Review request" : "Payment details"}</p>
                <h3 className="mt-1 text-xl font-bold text-ink dark:text-white">{selected.user}</h3>
                <p className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50"><Mail size={12} /> {selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/50 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition"><X size={16} /></button>
            </div>
            <div className="mt-5 grid gap-3 rounded-2xl bg-paper p-4 dark:bg-white/[0.05]">
              <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5 text-ink/50 dark:text-white/50"><CardIcon size={13} /> Plan</span><span className="font-semibold text-ink dark:text-white">{selected.plan}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink/50 dark:text-white/50">Amount</span><span className="font-bold text-ink dark:text-white">{selected.amount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink/50 dark:text-white/50">{t("methodLabel")}</span><span className="font-medium text-ink dark:text-white">{selected.method}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink/50 dark:text-white/50">{t("txnIdLabel")}</span><span className="font-mono text-xs font-semibold text-ink dark:text-white">{selected.txn}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink/50 dark:text-white/50">{t("dateLabel")}</span><span className="text-ink dark:text-white">{selected.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink/50 dark:text-white/50">{t("status")}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected.status === "Pending" ? "bg-[#fff6dd] text-[#b77900]" : selected.status === "Rejected" ? "bg-red-100 text-red-600" : "bg-[#e5f8f1] text-[#159570]"}`}>{selected.status}</span></div>
              {selected.notes && selected.status === "Rejected" && (
                <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{t("rejectionReason")}</p>
                  <p className="mt-1 text-sm leading-5 text-ink/70 dark:text-white/70 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.status === "Pending" ? (
                <>
                  <button onClick={() => updateStatus(selected.id, "Approved")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 hover:shadow-md transition"><Check size={16} /> Approve</button>
                  <button onClick={() => { setRejectTarget(selected); setRejectReason(""); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 hover:shadow-md transition"><Ban size={16} /> Reject</button>
                </>
              ) : null}
              <button onClick={() => { if (selected) { setManageUser(selected); setSelected(null); } }} className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white"><User size={16} /> Manage user</button>
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">{t("close")}</button>
            </div>
            <p className="mt-3 text-center text-[11px] text-ink/40 dark:text-white/30">{t("personalPlanControl")}</p>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => !rejecting && setRejectTarget(null)}>
          <div className="w-full max-w-md rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-600">{t("rejectPayment")}</p>
                <h3 className="mt-1 text-lg font-bold text-ink dark:text-white">{rejectTarget.user}</h3>
                <p className="text-xs text-ink/50 dark:text-white/50">{rejectTarget.email} · {rejectTarget.txn}</p>
              </div>
              <button onClick={() => !rejecting && setRejectTarget(null)} className="grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/50 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60"><X size={16} /></button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-ink dark:text-white">{t("rejectionReasonLabel")} <span className="text-red-500">*</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("rejectionPlaceholder")}
                rows={4}
                className="mt-2 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 bg-paper p-3 text-sm focus:border-red-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>
            <p className="mt-2 text-xs text-ink/40 dark:text-white/30">{t("rejectionNote")}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setRejectTarget(null)} disabled={rejecting} className="flex-1 rounded-full border border-ink/10 bg-white py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-50">{t("cancel")}</button>
              <button
                onClick={async () => {
                  if (!rejectReason.trim()) return;
                  setRejecting(true);
                  await updateStatus(rejectTarget.id, "Rejected", rejectReason.trim());
                  setRejecting(false);
                  setRejectTarget(null);
                }}
                disabled={!rejectReason.trim() || rejecting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {rejecting ? "Rejecting..." : <><Ban size={16} /> Confirm reject</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setManageUser(null)}>
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white font-bold shrink-0">{manageUser.user.slice(0,2).toUpperCase()}</span>
                <div>
                  <h3 className="font-bold text-ink dark:text-white">{manageUser.user}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50"><Mail size={12}/>{manageUser.email}</p>
                  <p className="mt-1 text-xs text-ink/40 dark:text-white/30">Personal per-app plan control</p>
                </div>
              </div>
              <button onClick={() => setManageUser(null)} className="grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/50 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition"><X size={16}/></button>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40">Apps & plans</p>
              {userSubsLoading ? <p className="mt-3 text-sm text-ink/50">Loading subscriptions...</p> : (
                <div className="mt-3 grid gap-3">
                  {realApps.map((app: any) => {
                    const appIdKey = app.slug || app._id || app.id;
                    const sub = userSubs.find((s) => s.plan?.appId === appIdKey || s.plan?.appSlug === appIdKey || s.plan?.slug?.includes(appIdKey) || s.plan?.name?.toLowerCase().includes(String(app.name).toLowerCase()));
                    const status = sub?.status ?? "none";
                    const isActive = status === "active";
                    const isExpired = status === "expired" || status === "cancelled";
                    return (
                      <div key={app.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-white"><span className="grid h-7 w-7 place-items-center rounded-lg text-sm text-white" style={{backgroundColor: (app as any).accent ?? "#6C63FF"}}>{(app as any).icon ?? String(app.name).slice(0,1).toUpperCase()}</span>{app.name}</p>
                          <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{sub ? `${sub.plan?.name ?? (app as any).plans?.[0]?.name ?? "No plan"} · ${status}` : "No plan"}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isActive ? (
                            <button disabled={perAppActionLoading===app.id} onClick={() => toggleUserAppPlan(app.id, "stop")} className="inline-flex min-w-[92px] justify-center whitespace-nowrap items-center gap-1 rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"><Ban size={12}/> Stop</button>
                          ) : (
                            <button disabled={perAppActionLoading===app.id} onClick={() => toggleUserAppPlan(app.id, "activate")} className="inline-flex min-w-[92px] justify-center whitespace-nowrap items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Check size={12}/> {isExpired ? "Reactivate" : "Activate"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Link href={`/admin/users`} className="flex-1 rounded-xl border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:text-white">{t("goToUsers")}</Link>
              <button onClick={() => setManageUser(null)} className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-ink">{t("close")}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
