"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const providers = ["google", "facebook", "github", "apple", "microsoft", "discord", "twitter", "linkedin"] as const;
type Provider = typeof providers[number];
type OAuthItem = { _id: string; provider: Provider; name: string; enabled: boolean; credentials?: Record<string, string>; status: string };

export function OAuthProvidersManager() {
  const [items, setItems] = useState<OAuthItem[]>([]);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("google");
  const [name, setName] = useState("Google");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const { success, error } = useToast();

  async function load() {
    try {
      const response = await fetch("/api/admin/integrations");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load OAuth providers");
      setItems((result.data ?? []).filter((item: OAuthItem) => providers.includes(item.provider)));
    } catch (caught) { error(caught instanceof Error ? caught.message : "Unable to load OAuth providers"); }
  }
  useEffect(() => { load(); }, []);

  function choose(value: Provider) { setProvider(value); setName(value.charAt(0).toUpperCase() + value.slice(1)); }
  async function add() {
    const response = await fetch("/api/admin/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, name, credentials: { clientId, clientSecret } }) });
    const result = await response.json();
    if (!response.ok) { error(result.error ?? "Unable to add OAuth provider"); return; }
    setItems((current) => [...current, result.data]); setOpen(false); setClientId(""); setClientSecret(""); success(`${name} OAuth provider added.`);
  }
  async function remove(id: string) {
    if (!window.confirm("Remove this OAuth method?")) return;
    const response = await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" });
    if (response.ok) { setItems((current) => current.filter((item) => item._id !== id)); success("OAuth method removed."); } else error("Unable to remove OAuth method");
  }

  return <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#13172b] lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-ink dark:text-white">OAuth login providers</h2><p className="mt-2 text-sm text-ink/55 dark:text-white/60">These providers let users create accounts and sign in.</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Add OAuth method</button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{items.map((item) => <div key={item._id} className={`rounded-xl border-2 p-4 ${item.status === "connected" ? "border-emerald-500/60" : "border-amber-400/70"}`}><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-ink dark:text-white">{item.name} OAuth</h3><button type="button" onClick={() => remove(item._id)} title="Remove OAuth method" className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div><p className="mt-2 text-xs font-semibold text-emerald-500">Available for login/signup</p><p className="mt-2 break-all text-xs text-ink/50 dark:text-white/50">Callback: /api/auth/callback/{item.provider}</p></div>)}</div>{open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171b31]"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-ink dark:text-white">Add OAuth method</h3><button type="button" onClick={() => setOpen(false)} className="text-ink/50 dark:text-white/50">Close</button></div><label className="mt-5 block text-sm font-semibold text-ink/70 dark:text-white/70">Provider<select value={provider} onChange={(event) => choose(event.target.value as Provider)} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white">{providers.map((value) => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></label><label className="mt-4 block text-sm font-semibold text-ink/70 dark:text-white/70">Card name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white" /></label><label className="mt-4 block text-sm font-semibold text-ink/70 dark:text-white/70">Client ID<input value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white" /></label><label className="mt-4 block text-sm font-semibold text-ink/70 dark:text-white/70">Client secret<input type="password" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white" /></label><button type="button" onClick={add} disabled={!name.trim()} className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Add OAuth method</button></div></div>}</section>;
}