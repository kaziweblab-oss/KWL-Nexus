"use client";

import { Copy, KeyRound, ShieldOff, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

type KeyRecord = { _id?: string; id?: string; name: string; isRevoked: boolean; rateLimitPerHour: number; createdAt?: string; lastUsedAt?: string | null };

// Plaintext is shown only after creation because the API stores only its hash.
export function ApiKeyManagerFull() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [newKey, setNewKey] = useState("");
  const [keyName, setKeyName] = useState("");
  const [nameError, setNameError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() {
    try {
      const response = await fetch("/api/admin/keys");
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as { data?: KeyRecord[] }) : {};
      if (response.ok && payload.data) setKeys(payload.data);
    } catch {}
  }
  useEffect(() => { void load(); }, []);
  async function generate() {
    if (!keyName.trim()) { setNameError("Key name is required — name chara key generate hobe na."); return; }
    setNameError("");
    try {
      const response = await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: keyName.trim() }) });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { data?: { key?: string }; error?: string }) : {};
      if (response.ok && data.data?.key) { setNewKey(data.data.key); setKeyName(""); void load(); }
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
  return <div><div className="space-y-3">{keys.length === 0 && <p className="rounded-xl border border-dashed border-ink/20 py-8 text-center text-sm text-ink/50 dark:border-white/10 dark:text-white/50">No API keys yet — generate one below.</p>}{keys.map((key) => {
    const id = key._id ?? key.id ?? "";
    const created = fmtDate(key.createdAt);
    const lastUsed = fmtDate(key.lastUsedAt);
    return <div key={id} className="flex items-center justify-between gap-3 rounded-xl bg-paper p-4 dark:bg-white/[0.03]"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink dark:text-white">{key.name}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/50">{key.isRevoked ? "Revoked" : `Active · ${key.rateLimitPerHour} requests/hour`}{created ? ` · Created ${created}` : ""}{lastUsed ? ` · Last used ${lastUsed}` : ""}</p></div><div className="flex shrink-0 gap-2">{!key.isRevoked && <button aria-label="Revoke API key" title="Revoke (disable, keep row)" disabled={busyId === id} onClick={() => revoke(id)} className="grid h-9 w-9 place-items-center rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"><ShieldOff size={16} /></button>}<button aria-label="Delete API key" title="Delete permanently (remove row)" disabled={busyId === id} onClick={() => remove(id, key.name)} className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"><Trash2 size={16} /></button></div></div>;
  })}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={keyName} onChange={(e) => { setKeyName(e.target.value); if (e.target.value.trim()) setNameError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void generate(); } }} placeholder="Key name (required — e.g. Desktop app) *" maxLength={60} className="h-10 flex-1 rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white" /><button onClick={generate} disabled={!keyName.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><KeyRound size={15} /> Generate new key</button></div>{nameError && <p className="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">{nameError}</p>}{newKey && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/30"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Copy this key now</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-emerald-950 dark:text-emerald-100">{newKey}</code><button aria-label="Copy API key" title="Copy key" onClick={() => navigator.clipboard.writeText(newKey)} className="text-emerald-700/70 hover:text-primary dark:text-emerald-200/70"><Copy size={16} /></button></div></div>}</div>;
}

export function ApiKeyManager() {
  return <Link href="/admin/settings/api-keys" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><KeyRound size={16} /> Manage API keys</Link>;
}
