"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Plus, Settings2, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const defaults = ["google", "facebook", "github"];
const extras = ["apple", "microsoft", "discord", "twitter", "linkedin"];
type Item = { _id: string; provider: string; name: string };

function ProviderIcon({ provider, size = 20 }: { provider: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" } as const;
  switch (provider) {
    case "google":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09A6.98 6.98 0 0 1 5.48 12c0-.73.13-1.44.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 17.458 3.917 22.016 9.063 22.948v-5.704H6.95V12.07h2.113V9.845c0-2.086 1.243-3.239 3.145-3.239.91 0 1.863.163 1.863.163v2.047h-1.05c-1.035 0-1.358.643-1.358 1.302v1.952h2.31l-.369 2.174h-1.941v5.704C20.083 22.016 24 17.458 24 12.073z" fill="#1877F2" /></svg>
      );
    case "github":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.26.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.083-.73.083-.73 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.236-3.22-.124-.303-.536-1.524.117-3.176 0 0 1.008-.323 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.804 5.624-5.475 5.921.43.37.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12.073 24 5.423 18.627.297 12 .297z" fill="currentColor" className="text-[#181717] dark:text-white" /></svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 12h18M12 3a15 15 0 0 1 5 9 15 15 0 0 1-5 9 15 15 0 0 1-5-9 15 15 0 0 1 5-9z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
      );
  }
}

function providerBg(provider: string) {
  const map: Record<string, string> = {
    google: "bg-white border border-slate-200 dark:bg-white dark:border-transparent",
    facebook: "bg-[#1877F2]/10 text-[#1877F2]",
    github: "bg-[#181717]/5 dark:bg-white/10 text-[#181717] dark:text-white",
  };
  return map[provider] ?? "bg-primary/10 text-primary";
}

export function OAuthManagementCards() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("apple");
  const [name, setName] = useState("Apple");
  const { success, error } = useToast();
  useEffect(() => { fetch("/api/admin/integrations").then((response) => response.json()).then((result) => setItems((result.data ?? []).filter((item: Item) => extras.includes(item.provider)))).catch(() => error("Unable to load OAuth methods")); }, []);
  useEffect(() => { fetch("/api/admin/oauth-status").then((response) => response.json()).then((result) => setReady(result.data ?? {})).catch(() => undefined); }, []);
  async function add() { const response = await fetch("/api/admin/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, name, credentials: {} }) }); const result = await response.json(); if (!response.ok) { error(result.error ?? "Unable to add OAuth method"); return; } setItems((current) => [...current, result.data]); setOpen(false); success(`${name} OAuth method added.`); }
  async function remove(id: string) { if (!window.confirm("Remove this OAuth method?")) return; const response = await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" }); if (response.ok) { setItems((current) => current.filter((item) => item._id !== id)); success("OAuth method removed."); } else error("Unable to remove OAuth method"); }
  async function check(id: string) { const response = await fetch(`/api/admin/integrations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check: true }) }); const result = await response.json(); if (!response.ok) { error("Unable to check integration"); return; } const ok = result.data?.status === "connected"; if (ok) success("Connection is valid."); else error(result.data?.statusMessage ?? "Connection check failed."); }
  const cards = [...defaults.map((value) => ({ provider: value, name: value[0].toUpperCase() + value.slice(1), custom: false, id: undefined as string | undefined })), ...items.map((item) => ({ provider: item.provider, name: item.name, custom: true, id: item._id }))];
  const border = (provider: string, isCustom?: boolean) => {
    const ok = ready[provider] || isCustom;
    return ok ? "border-emerald-500/70" : "border-amber-400/70";
  };
  const statusColor = (provider: string, isCustom?: boolean) => (ready[provider] || isCustom ? "text-emerald-500" : "text-amber-500");
  const statusText = (provider: string, isCustom?: boolean) => (ready[provider] || isCustom ? "Connected" : "Setup required");
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#13172b] lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink dark:text-white">OAuth login providers</h2>
          <p className="mt-2 text-sm text-ink/55 dark:text-white/60">Manage providers users can use to create accounts and sign in.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} /> Add OAuth method
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article key={card.provider + (card.id ?? "")} className={`rounded-2xl border-2 bg-paper p-5 dark:bg-white/[0.03] ${border(card.provider, card.custom)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${providerBg(card.provider)}`}>
                  <ProviderIcon provider={card.provider} size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-ink dark:text-white">{card.name} OAuth</h3>
                  <p className="mt-1 text-xs uppercase tracking-widest text-ink/45 dark:text-white/45">{card.provider}</p>
                </div>
              </div>
              {card.custom && (
                <button type="button" onClick={() => remove(card.id!)} title="Remove OAuth method" className="rounded-lg p-2 text-red-500">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${statusColor(card.provider, card.custom)}`}>
              {ready[card.provider] || card.custom ? <Check size={16} /> : <CircleAlert size={16} />}
              {statusText(card.provider, card.custom)}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/admin/settings/oauth/${card.provider}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
                <Settings2 size={14} className="mr-1 inline" /> Manage {card.name} OAuth
              </Link>
              {card.custom && (
                <button type="button" onClick={() => void check(card.id!)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-semibold dark:border-white/10 dark:text-white">
                  Check
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171b31]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink dark:text-white">Add OAuth method</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-ink/70 dark:text-white/70">
                Provider
                <select value={provider} onChange={(e) => { setProvider(e.target.value); setName(e.target.value[0].toUpperCase() + e.target.value.slice(1)); }} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  {extras.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-ink/70 dark:text-white/70">
                Label
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold dark:border-white/10 dark:text-white">
                Cancel
              </button>
              <button type="button" onClick={() => void add()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                Add OAuth method
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
