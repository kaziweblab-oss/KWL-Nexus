"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, KeyRound, Loader2, Plug } from "lucide-react";
import { useEffect, useState } from "react";

type AppDoc = { _id: string; name: string; slug: string; apiLastSeenAt?: string | null };

function CopyLine({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 dark:bg-black/40">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
        <p className={`truncate text-sm font-semibold text-white ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      <button onClick={() => void copy()} title={`Copy ${label}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
        {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
      </button>
    </div>
  );
}

export default function AppConnectPage({ params }: { params: { id: string } }) {
  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/apps/${encodeURIComponent(params.id)}`, { cache: "no-store" })
      .then(async (res) => {
        const text = await res.text();
        const j = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(j.error ?? "App not found");
        if (active) { setApp(j.data); setError(""); }
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Unable to load app"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return <main className="grid place-items-center py-24 text-sm text-ink/50 dark:text-white/50"><Loader2 className="animate-spin" size={22} /></main>;
  }
  if (error || !app) {
    return (
      <main>
        <Link href="/admin/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary"><ArrowLeft size={16} /> Back to apps</Link>
        <p className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error || "App not found"}</p>
      </main>
    );
  }

  const slug = app.slug;
  const connected = app.apiLastSeenAt ? Date.now() - new Date(app.apiLastSeenAt).getTime() < 30 * 24 * 60 * 60 * 1000 : false;

  const steps = [
    {
      n: "1",
      title: "Get an API key",
      body: "Admin panel > Settings > Project integrations > API keys. Create a key scoped to this app, copy it once. Deliver it over a secure channel only.",
      action: { href: "/admin/settings/api-keys", label: "Manage API keys", Icon: KeyRound },
    },
    {
      n: "2",
      title: "Configure the desktop app",
      body: "Paste these three values into the app settings (Nexus section).",
      values: [
        { label: "appId", value: slug },
        { label: "baseUrl", value: "https://kwl-nexus.onrender.com" },
        { label: "apiKey", value: "<paste-the-key-here>" },
      ],
    },
    {
      n: "3",
      title: "Verify the connection",
      body: "The app calls this on startup. A 200 with connected:true means the editor flips to Connected.",
      values: [{ label: "ping", value: `POST /api/apps/${slug}/ping  +  x-api-key header` }],
    },
    {
      n: "4",
      title: "Sync data + reports",
      body: "After install/update the app pushes features + tutorial, reports user issues, and polls replies.",
      values: [
        { label: "features", value: `POST /api/apps/${slug}/features` },
        { label: "tutorial", value: `PUT /api/admin/apps/${slug}/tutorial` },
        { label: "report", value: "POST /api/feedback" },
        { label: "replies", value: "GET /api/feedback" },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-3xl">
      <Link href={`/admin/apps/${slug}/edit`} className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50"><ArrowLeft size={16} /> Back to editor</Link>
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.22em] text-primary">API connection</p>
      <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold tracking-tight text-ink dark:text-white">
        <Plug size={30} className="text-primary" /> Connect {app.name}
      </h1>
      <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${connected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
        {connected ? `Connected${app.apiLastSeenAt ? ` · last seen ${new Date(app.apiLastSeenAt).toLocaleString()}` : ""}` : "Not connected yet"}
      </p>

      <div className="mt-8 grid gap-4">
        {steps.map((s) => (
          <section key={s.n} className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">{s.n}</span>
              <h2 className="text-lg font-bold text-ink dark:text-white">{s.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/60 dark:text-white/60">{s.body}</p>
            {s.values && <div className="mt-4 grid gap-2">{s.values.map((v) => <CopyLine key={v.label} label={v.label} value={v.value} />)}</div>}
            {s.action && (
              <Link href={s.action.href} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90">
                <s.action.Icon size={14} /> {s.action.label} <ArrowRight size={12} />
              </Link>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
