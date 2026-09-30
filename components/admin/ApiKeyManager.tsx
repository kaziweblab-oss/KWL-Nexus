"use client";

import { Copy, Eye, EyeOff, KeyRound, ShieldOff, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

type KeyRecord = { _id?: string; id?: string; name: string; appId?: string | null; lastAppSlug?: string | null; lastAppAt?: string | null; lastApp?: { slug?: string; name?: string; iconUrl?: string | null; isPublished?: boolean; latestVersion?: string | null }; isRevoked: boolean; rateLimitPerHour: number; createdAt?: string; lastUsedAt?: string | null };

// Plaintext is shown only after creation because the API stores only its hash.
export function ApiKeyManagerFull() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [newKey, setNewKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [keyApp, setKeyApp] = useState("");
  const [apps, setApps] = useState<{ slug: string; name: string }[]>([]);
  const [nameError, setNameError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [copied, setCopied] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState("");
  const [revealError, setRevealError] = useState("");
  async function load() {
    try {
      const response = await fetch("/api/admin/keys");
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as { data?: KeyRecord[] }) : {};
      if (response.ok && payload.data) setKeys(payload.data);
    } catch {}
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    fetch("/api/admin/apps", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => { if (Array.isArray(j.data)) setApps(j.data.map((a: { slug?: string; name?: string }) => ({ slug: a.slug ?? "", name: a.name ?? a.slug ?? "" })).filter((a: { slug: string }) => a.slug)); })
      .catch(() => {});
  }, []);
  async function generate() {
    if (!keyName.trim()) { setNameError("Please enter a name for this key."); return; }
    setNameError("");
    try {
      const response = await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: keyName.trim(), appId: keyApp || undefined }) });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { data?: { key?: string }; error?: string }) : {};
      if (response.ok && data.data?.key) { setNewKey(data.data.key); setKeyName(""); setKeyApp(""); void load(); }
      else setNameError(data.error ?? "Failed to generate key.");
    } catch { setNameError("Failed to generate key."); }
  }
  // Revoke = soft disable, row stays for audit. Delete = hard remove, row disappears from this tab.
  async function revoke(id: string) {
    if (!id) return;
    setBusyId(id);
    try { await fetch(`/api/admin/keys?id=${id}`, { method: "DELETE" }); } finally { setBusyId(""); }
    void load();
  }
  async function remove(id: string, name: string) {
    if (!id) return;
    if (!window.confirm(`Delete "${name}" permanently? This cannot be undone.`)) return;
    setBusyId(id);
    try { await fetch(`/api/admin/keys?id=${id}&hard=true`, { method: "DELETE" }); } finally { setBusyId(""); }
    void load();
  }
  function fmtDate(value?: string | null) {
    if (!value) return null;
    try { return new Date(value).toLocaleString(); } catch { return null; }
  }
  async function reveal(id: string) {
    if (!id || revealed[id]) { setRevealed((prev) => { const next = { ...prev }; delete next[id]; return next; }); setRevealError(""); return; }
    setRevealingId(id);
    setRevealError("");
    try {
      const res = await fetch(`/api/admin/keys/reveal?id=${id}`, { cache: "no-store" });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { data?: { key?: string }; error?: string }) : {};
      if (res.ok && data.data?.key) setRevealed((prev) => ({ ...prev, [id]: data.data!.key! }));
      else setRevealError(data.error ?? "Unable to reveal this key.");
    } catch { setRevealError("Unable to reveal this key."); }
    finally { setRevealingId(""); }
  }
  async function copyText(text: string, tag: string) {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(tag);
      setTimeout(() => setCopied(""), 2000);
    } catch {}
  }
  return <div><div className="space-y-3">{keys.length === 0 && <p className="rounded-xl border border-dashed border-ink/20 py-8 text-center text-sm text-ink/50 dark:border-white/10 dark:text-white/50">No API keys yet — generate one below.</p>}{keys.map((key) => {
    const id = key._id ?? key.id ?? "";
    const created = fmtDate(key.createdAt);
    const lastUsed = fmtDate(key.lastUsedAt);
    return <div key={id} className="overflow-hidden rounded-xl bg-paper dark:bg-white/[0.03]"><button onClick={() => setExpandedId((cur) => (cur === id ? "" : id))} title={expandedId === id ? "Collapse" : "Expand details"} className="flex w-full items-center justify-between gap-3 p-4 text-left"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink dark:text-white">{key.name}{key.appId ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:text-secondary">{key.appId}</span> : null}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/50">{key.isRevoked ? "Revoked" : `Active · ${key.rateLimitPerHour} requests/hour`}{created ? ` · Created ${created}` : ""}{lastUsed ? ` · Last used ${lastUsed}` : ""}</p></div><div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>{!key.isRevoked && <button aria-label="Revoke API key" title="Revoke (disable, keep row)" disabled={busyId === id} onClick={() => revoke(id)} className="grid h-9 w-9 place-items-center rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"><ShieldOff size={16} /></button>}<button aria-label="Delete API key" title="Delete permanently (remove row)" disabled={busyId === id} onClick={() => remove(id, key.name)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"><Trash2 size={16} /></button></div></button>{expandedId === id && <div className="border-t border-ink/10 px-4 py-3 dark:border-white/10"><dl className="grid gap-2 text-xs sm:grid-cols-2"><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5"><dt className="font-semibold text-ink/50 dark:text-white/50">Key ID</dt><dd className="flex min-w-0 items-center gap-1.5"><code className="truncate font-mono text-ink dark:text-white">{id}</code><button aria-label="Copy key ID" title="Copy key ID" onClick={() => copyText(id, `id-${id}`)} className="shrink-0 text-ink/40 hover:text-primary dark:text-white/40"><Copy size={14} /></button>{copied === `id-${id}` && <span className="shrink-0 font-semibold text-emerald-600">Copied</span>}</dd></div><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5"><dt className="font-semibold text-ink/50 dark:text-white/50">Status</dt><dd className="text-ink dark:text-white">{key.isRevoked ? "Revoked" : "Active"}</dd></div><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5"><dt className="font-semibold text-ink/50 dark:text-white/50">Scope</dt><dd className="text-ink dark:text-white">{key.appId || "All apps"}</dd></div><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5 sm:col-span-2"><dt className="font-semibold text-ink/50 dark:text-white/50">Used by</dt><dd className="flex min-w-0 items-center gap-2">{key.lastApp ? (<><span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-xs font-bold text-primary">{key.lastApp.iconUrl ? <img src={key.lastApp.iconUrl} alt="" className="h-full w-full object-cover" /> : (key.lastApp.name ?? "?").slice(0, 1).toUpperCase()}</span><span className="min-w-0 truncate text-ink dark:text-white">{key.lastApp.name}{key.lastApp.latestVersion ? ` v${key.lastApp.latestVersion}` : ""} · {key.lastApp.isPublished ? "Live" : "Draft"}</span><Link href={`/admin/apps/${key.lastApp.slug}/edit`} className="shrink-0 font-semibold text-primary hover:underline">Open</Link></>) : <span className="text-ink/45 dark:text-white/40">Not used yet</span>}</dd></div><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5"><dt className="font-semibold text-ink/50 dark:text-white/50">Rate limit</dt><dd className="text-ink dark:text-white">{key.rateLimitPerHour}/hour</dd></div><div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-white/5"><dt className="font-semibold text-ink/50 dark:text-white/50">Last used</dt><dd className="text-ink dark:text-white">{lastUsed ?? "Never"}</dd></div></dl><div className="mt-2 rounded-lg bg-ink px-3 py-2.5 dark:bg-black/40">{revealed[id] ? <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all font-mono text-[11px] text-white/90">{revealed[id]}</code><button aria-label="Copy secret key" title="Copy secret key" onClick={() => copyText(revealed[id], `sec-${id}`)} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/60 hover:text-white"><Copy size={14} />{copied === `sec-${id}` ? "Copied" : "Copy"}</button><button aria-label="Hide secret key" title="Hide secret key" onClick={() => reveal(id)} className="shrink-0 text-xs font-semibold text-white/60 hover:text-white"><EyeOff size={14} /></button></div> : <div className="flex items-center justify-between gap-2"><code className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/60">x-api-key: ••••••••</code><button aria-label="Show secret key" title="Show secret key" disabled={revealingId === id} onClick={() => reveal(id)} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/80 hover:text-white disabled:opacity-50"><Eye size={14} />{revealingId === id ? "Showing…" : "Show key"}</button></div>}</div>{revealError && expandedId === id && <p className="mt-2 text-[11px] font-semibold text-red-500 dark:text-red-400">{revealError}</p>}<p className="mt-2 text-[11px] leading-4 text-ink/40 dark:text-white/30">Purono key (reveal support-এর আগে বানানো) দেখা যাবে না — revoke করে নতুন key বানাও।</p></div>}</div>;
  })}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={keyName} onChange={(e) => { setKeyName(e.target.value); if (e.target.value.trim()) setNameError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void generate(); } }} placeholder="Key name (required — e.g. Desktop app) *" maxLength={60} className="h-10 flex-1 rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white" /><select value={keyApp} onChange={(e) => setKeyApp(e.target.value)} title="Scope this key to one app (optional)" className="h-10 rounded-xl border border-ink/10 bg-paper px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white"><option value="">All apps</option>{apps.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select><button onClick={generate} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"><KeyRound size={15} /> Generate new key</button></div>{nameError && <p className="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">{nameError}</p>}{newKey && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/30"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Copy this key now</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-emerald-950 dark:text-emerald-100">{newKey}</code><button aria-label="Copy API key" title="Copy key" onClick={() => navigator.clipboard.writeText(newKey)} className="text-emerald-700/70 hover:text-primary dark:text-emerald-200/70"><Copy size={16} /></button></div></div>}</div>;
}

export function ApiKeyManager() {
  return <Link href="/admin/settings/api-keys" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><KeyRound size={16} /> Manage API keys</Link>;
}
