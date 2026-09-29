"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Calendar, Tag } from "lucide-react";
import { useSession } from "next-auth/react";

type Notif = { _id: string; title: string; message: string; read: boolean; appId?: string; appName?: string; integrationId?: string; createdAt: string; type: string };

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  async function load() {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setItems(Array.isArray(j.data) ? j.data : []);
      }
    } catch {}
    setLoading(false);
  }
  useEffect(() => { if (status !== "loading") load(); }, [status, session?.user?.email]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) });
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {}
  }
  async function markAllRead() {
    await Promise.all(items.filter((i) => !i.read).map((i) => markRead(i._id)));
  }
  async function clearAll() {
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (res.ok) setItems([]);
    } catch {}
  }

  const filtered = items.filter((n) => (filter === "unread" ? !n.read : filter === "read" ? n.read : true));
  const unread = items.filter((i) => !i.read).length;
  const isAdmin = Boolean((session?.user as any)?.isAdmin);

  if (status === "loading") return <main className="mx-auto max-w-4xl px-6 py-10"><p className="text-sm text-ink/50">Loading...</p></main>;
  if (!session?.user?.email) return <main className="mx-auto max-w-4xl px-6 py-10 text-center"><p className="text-sm text-ink/60">Please sign in to view notifications.</p><Link href="/login" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">Sign in</Link></main>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-ink dark:text-white"><Bell size={22} className="text-primary" /> Notifications</h1>
          <p className="mt-1 text-sm text-ink/55 dark:text-white/60">{items.length} total · {unread} unread</p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && <button onClick={markAllRead} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-primary"> <CheckCheck size={12}/> Mark all read</button>}
          {items.length > 0 && <button onClick={clearAll} className="rounded-full border border-transparent bg-white px-4 py-2 text-xs font-semibold text-ink/60 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30">Clear all</button>}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        {(["all", "unread", "read"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? "bg-ink text-white dark:bg-white dark:text-ink" : "bg-paper text-ink/60 hover:bg-ink/5 dark:bg-white/5 dark:text-white/60"}`}>{f}</button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#1a1a2e]">
        {loading ? <p className="p-10 text-center text-sm text-ink/50">Loading...</p> : filtered.length === 0 ? <p className="p-10 text-center text-sm text-ink/50 dark:text-white/50">No {filter !== "all" ? filter : ""} notifications</p> : (
          <div className="divide-y divide-ink/10 dark:divide-white/10">
            {filtered.map((n) => (
              <div key={n._id} className={`flex gap-4 p-5 hover:bg-paper/50 dark:hover:bg-white/5 ${!n.read ? "bg-primary/[0.04] dark:bg-white/[0.03]" : ""}`}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink dark:text-white">{n.title}</p>
                    {n.appName && <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink/60 dark:bg-white/10 dark:text-white/60">{n.appName}</span>}
                    {!n.read && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">New</span>}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/70 dark:text-white/70 whitespace-pre-wrap">{n.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink/40 dark:text-white/30">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(n.createdAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Tag size={12}/> {n.type}</span>
                    {n.appId && <span>App: {n.appId}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {n.type === "payment" && (
                    isAdmin ? (
                      <Link href="/admin/payments" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90">Review Payment</Link>
                    ) : (
                      <Link href="/my-orders" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90">View Order</Link>
                    )
                  )}
                  {isAdmin && n.type === "integration" && n.integrationId && <Link href={`/admin/settings/integrations/${n.integrationId}`} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90">Setup</Link>}
                  {n.type === "subscription" && n.appId && <Link href={`/payment?appId=${n.appId}`} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Renew</Link>}
                  {!n.read ? <button onClick={() => markRead(n._id)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90">Mark read</button> : <span className="text-xs text-ink/30 dark:text-white/30">Read</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
