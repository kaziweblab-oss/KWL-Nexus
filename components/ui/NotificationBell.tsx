"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useRef } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notif = { _id: string; title: string; message: string; read: boolean; appId?: string; appName?: string; integrationId?: string; createdAt: string; type: string };

function getLocalKey(email?: string | null) {
  return `kwl-read-notifs:${(email || "anon").toLowerCase()}`;
}
function getLocalReadIds(email?: string | null): Set<string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(getLocalKey(email)) : null;
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function addLocalReadId(id: string, email?: string | null) {
  try {
    const set = getLocalReadIds(email);
    set.add(id);
    localStorage.setItem(getLocalKey(email), JSON.stringify(Array.from(set)));
  } catch {}
}
function mergeWithLocal(data: Notif[], email?: string | null): Notif[] {
  const local = getLocalReadIds(email);
  if (local.size === 0) return data;
  return data.map((n) => (local.has(n._id) ? { ...n, read: true } : n));
}

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.email) { setItems([]); return; }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled && Array.isArray(j.data)) setItems(mergeWithLocal(j.data, session?.user?.email));
      } catch {}
    }
    load();
    const id = setInterval(load, 15000);
    const handler = () => load();
    window.addEventListener("notifications-refresh", handler);
    window.addEventListener("focus", handler);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("notifications-refresh", handler); window.removeEventListener("focus", handler); };
  }, [session?.user?.email]);
  useEffect(() => {
    if (!open || !session?.user?.email) return;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (Array.isArray(j.data)) setItems(mergeWithLocal(j.data, session?.user?.email));
      } catch {}
    })();
  }, [open, session?.user?.email]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [detail, setDetail] = useState<Notif | null>(null);

  const unread = items.filter((i) => !i.read).length;
  const isAdmin = Boolean((session?.user as any)?.isAdmin);

  async function markRead(id: string) {
    // optimistic + local persistence — fixes "abar unread" when server poll overwrites
    addLocalReadId(id, session?.user?.email);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }), keepalive: true } as RequestInit);
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("markRead failed", res.status, t);
      }
    } catch (e) {
      console.error("markRead network error", e);
    }
  }
  function openDetail(n: Notif) {
    // instant read on open — fixes "click korle abar unread" because closeDetail alone was delayed
    setDetail({ ...n, read: true });
    if (!n.read) markRead(n._id);
  }
  async function closeDetail() {
    if (detail && !detail.read) {
      await markRead(detail._id);
      setDetail((d) => d ? { ...d, read: true } : null);
    }
    setDetail(null);
  }
  async function markAllRead() {
    const unreadIds = items.filter((i) => !i.read).map((i) => i._id);
    unreadIds.forEach((id) => addLocalReadId(id, session?.user?.email));
    await Promise.all(unreadIds.map((id) => markRead(id)));
  }
  async function clearAll() {
    if (items.length === 0) return;
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) {
        setItems([]);
        try { localStorage.removeItem(getLocalKey(session?.user?.email)); } catch {}
      }
    } catch {}
  }

  async function handleReview(n: Notif) {
    // reuse exact same function as Read btn — ensures read logic is identical (root cause: previously used separate fire-and-forget)
    if (!n.read) await markRead(n._id);
    setDetail(null);
    setOpen(false);
  }

  if (!session?.user?.email) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white text-ink/70 hover:bg-paper dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
          <div className="flex items-center justify-between border-b border-ink/10 p-4 dark:border-white/10">
            <p className="text-sm font-bold text-ink dark:text-white">Notifications</p>
            <div className="flex items-center gap-2">
              {unread > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"><CheckCheck size={12}/> Mark all read</button>}
              {items.length > 0 && <button onClick={clearAll} className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-ink/60 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:text-white/60 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30 transition">Clear</button>}
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full border border-transparent bg-white/5 text-ink/60 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500 dark:hover:text-white dark:hover:border-red-500 transition"><X size={14}/></button>
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {items.length === 0 ? <p className="p-8 text-center text-sm text-ink/50 dark:text-white/50">No notifications</p> : items.map((n) => (
              <div key={n._id} onClick={() => openDetail(n)} className={`flex items-center gap-3 border-b border-ink/5 p-4 hover:bg-paper/50 dark:border-white/5 dark:hover:bg-white/5 cursor-pointer ${!n.read ? "bg-primary/[0.04] dark:bg-white/[0.03]" : ""}`}>
                <div className={`h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink dark:text-white truncate">{n.title}{n.appName ? ` · ${n.appName}` : ""}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/60 dark:text-white/70 line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-[11px] text-ink/40 dark:text-white/30">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 self-center">
                  {n.type === "payment" && (
                    isAdmin ? (
                      <Link href="/admin/payments" onClick={async (e) => { e.stopPropagation(); e.preventDefault(); await handleReview(n); router.push("/admin/payments"); }} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90">Review</Link>
                    ) : (
                      <Link href="/my-orders" onClick={async (e) => { e.stopPropagation(); e.preventDefault(); await handleReview(n); router.push("/my-orders"); }} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90">View Order</Link>
                    )
                  )}
                  {n.type === "subscription" && n.appId && <Link href={`/payment?appId=${n.appId}`} onClick={(e) => e.stopPropagation()} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700">Renew</Link>}
                  {!n.read && <button onClick={(e) => { e.stopPropagation(); openDetail(n); }} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-primary/90 transition">Read</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 text-center">
            <Link href="/notifications" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 dark:bg-white dark:text-ink dark:hover:bg-white/90">View all</Link>
          </div>
        </div>
      )}
      {detail && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeDetail}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <div className="flex items-start justify-between border-b border-ink/10 p-5 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{detail.type}</p>
                <h3 className="mt-1 text-lg font-bold text-ink dark:text-white truncate">{detail.title}{detail.appName ? ` · ${detail.appName}` : ""}</h3>
                <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{new Date(detail.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={closeDetail} className="grid h-8 w-8 place-items-center rounded-full border border-transparent bg-paper text-ink/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-white/10 dark:text-white/50 dark:hover:bg-red-500 dark:hover:text-white transition"><X size={16}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm leading-6 text-ink/70 dark:text-white/80 whitespace-pre-wrap">{detail.message}</p>
              {detail.appName && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-ink/60 dark:bg-white/5 dark:text-white/60">App: {detail.appName} {detail.appId && `(${detail.appId})`}</p>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              {detail.type === "payment" && (
                isAdmin ? (
                  <Link href="/admin/payments" onClick={async (e) => { e.preventDefault(); await handleReview(detail); router.push("/admin/payments"); }} className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary/90">Review Payment</Link>
                ) : (
                  <Link href="/my-orders" onClick={async (e) => { e.preventDefault(); await handleReview(detail); router.push("/my-orders"); }} className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary/90">View Order</Link>
                )
              )}
              {detail.type === "integration" && detail.integrationId && <Link href={`/admin/settings/integrations/${detail.integrationId}`} onClick={closeDetail} className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary/90">Setup</Link>}
              {detail.type === "subscription" && detail.appId && <Link href={`/payment?appId=${detail.appId}`} onClick={closeDetail} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700">Renew now</Link>}
              <button onClick={closeDetail} className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:bg-white/10 dark:text-white hover:border-transparent dark:hover:bg-white dark:hover:text-ink transition">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
