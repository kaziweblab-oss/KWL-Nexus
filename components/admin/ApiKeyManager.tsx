"use client";

import { Copy, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

type KeyRecord = { _id?: string; id?: string; name: string; isRevoked: boolean; rateLimitPerHour: number };

// Plaintext is shown only after creation because the API stores only its hash.
export function ApiKeyManagerFull() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [newKey, setNewKey] = useState("");
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
    try {
      const response = await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Production key" }) });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { data?: { key?: string } }) : {};
      if (response.ok && data.data?.key) { setNewKey(data.data.key); void load(); }
    } catch {}
  }
  async function revoke(id: string) { await fetch(`/api/admin/keys?id=${id}`, { method: "DELETE" }); void load(); }
  return <div><div className="space-y-3">{keys.map((key) => <div key={key._id ?? key.id} className="flex items-center justify-between rounded-xl bg-paper p-4"><div><p className="text-sm font-semibold text-ink dark:text-white">{key.name}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/50">{key.isRevoked ? "Revoked" : `Active · ${key.rateLimitPerHour} requests/hour`}</p></div><div className="flex gap-3"><button aria-label="Regenerate API key" title="Regenerate" onClick={generate} className="text-ink/40 hover:text-primary dark:text-white/40"><RotateCcw size={16} /></button><button aria-label="Revoke API key" title="Revoke" onClick={() => revoke(key._id ?? key.id ?? "")} className="text-ink/40 hover:text-red-500 dark:text-white/40"><Trash2 size={16} /></button></div></div>)}</div><button onClick={generate} className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary"><KeyRound size={15} /> Generate new key</button>{newKey && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/30"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Copy this key now</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-emerald-950 dark:text-emerald-100">{newKey}</code><button aria-label="Copy API key" title="Copy key" onClick={() => navigator.clipboard.writeText(newKey)} className="text-emerald-700/70 hover:text-primary dark:text-emerald-200/70"><Copy size={16} /></button></div></div>}</div>;
}

export function ApiKeyManager() {
  return <Link href="/admin/settings/api-keys" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"><KeyRound size={16} /> Manage API keys</Link>;
}
