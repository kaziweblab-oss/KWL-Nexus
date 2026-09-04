"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Plus, Settings2, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/components/ui/Toast";
import { providerFields } from "@/lib/integrations/providers";

type Integration = { _id: string; provider: string; name: string; enabled: boolean; status: "incomplete" | "connected" | "error"; statusMessage?: string };
const names: Record<string, string> = { mongodb: "MongoDB", github: "GitHub", facebook: "Facebook", google: "Google", stripe: "Stripe", resend: "Resend", smtp: "SMTP", cloudinary: "Cloudinary", s3: "Amazon S3", twilio: "Twilio", firebase: "Firebase" };
const descriptions: Record<string, string> = { mongodb: "Database connection and storage", github: "Repository, release and download access", stripe: "Online payment processing", resend: "Transactional email delivery", smtp: "Custom email server", cloudinary: "Media and image storage", s3: "Object storage for application files", twilio: "SMS and phone verification", firebase: "Firebase project services", google: "Google OAuth sign-in", facebook: "Facebook OAuth sign-in" };

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
    case "mongodb":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M12 0C10.3 0 9.2 1.2 9.2 2.7c0 2 2.8 5.1 2.8 10.3 0 5.2-2.8 8.3-2.8 10.3 0 1.5 1.1 2.7 2.8 2.7 1.7 0 2.8-1.2 2.8-2.7 0-2-2.8-5.1-2.8-10.3C12 7.8 14.8 4.7 14.8 2.7 14.8 1.2 13.7 0 12 0z" fill="#47A248" /><path d="M12 2.7c-1 1.7-2.2 3.8-2.2 6.5 0 4.1 2.2 6.9 2.2 8.9 0-2 2.2-4.8 2.2-8.9 0-2.7-1.2-4.8-2.2-6.5z" fill="#016640" /></svg>
      );
    case "stripe":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M13.98 6.5c0 1.05-.54 1.67-1.6 1.67h-1.2V4.9h1.16c1.02 0 1.64.58 1.64 1.6zM11.18 9.3h1.32c1.12 0 1.86.62 1.86 1.82 0 1.22-.75 1.96-1.96 1.96h-1.22V9.3zM12.5 3.2H8.3v12.6h4.6c2.4 0 3.98-1.14 3.98-3.28 0-1.36-.78-2.3-2.02-2.68 1.08-.4 1.68-1.24 1.68-2.44C16.54 4.6 14.95 3.2 12.5 3.2z" fill="#635BFF" /></svg>
      );
    case "resend":
      return (
        <svg {...common} viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#000" /><path d="M6 8.5l6 4 6-4v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7z" fill="none" stroke="white" strokeWidth="1.4" strokeLinejoin="round" /><path d="M6.5 8.7l5.5 3.8 5.5-3.8" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
      );
    case "smtp":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11z" fill="#EAEAEA" stroke="#9AA0A6" strokeWidth="1.1" /><path d="M2.5 5.8L12 12l9.5-6.2" fill="none" stroke="#5F6368" strokeWidth="1.3" strokeLinecap="round" /></svg>
      );
    case "cloudinary":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M6.5 18a3.5 3.5 0 0 1-.5-7 4.8 4.8 0 0 1 9.2-1.4A3.5 3.5 0 0 1 18 18H6.5z" fill="#3448C5" stroke="#3448C5" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      );
    case "s3":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M3 8.5l9-5 9 5v7l-9 5-9-5v-7z" fill="#FF9900" stroke="#E67E00" strokeWidth="1" /><path d="M12 13.5l5.5-3-5.5-3-5.5 3 5.5 3z" fill="white" fillOpacity="0.95" /><path d="M9 9.2h2.2c.6 0 1 .2 1 .7 0 .4-.3.6-.8.6H9V9.2zm0 2.2h2.4c.5 0 .9.2.9.7s-.4.7-1 .7H9v-1.4zm3.7-2.1c.5-.1.9.3.9.8 0 .4-.2.6-.5.7.4.1.7.4.7.9 0 .7-.6 1.1-1.5 1.1H7.8V8.2h3.1c.8 0 1.4.3 1.4 1 0 .3-.1.6-.6.8z" fill="#232F3E" /><text x="12" y="17.2" textAnchor="middle" fontSize="3.2" fontWeight="700" fill="white">S3</text></svg>
      );
    case "twilio":
      return (
        <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#F22F46" /><path d="M8.2 8.6h2l1.2 4.6L12.6 8.6h1.9l1.2 4.6L17 8.6h2L16.6 15.4h-1.9L13.5 10.7 12.3 15.4H10.4L8.2 8.6z" fill="white" /></svg>
      );
    case "firebase":
      return (
        <svg {...common} viewBox="0 0 24 24"><path d="M5.8 18.7L2.2 13 9 2.5l2.2 3.7L5.8 18.7z" fill="#FFA000" /><path d="M12.5 3.5l3.7 11-3.7 3.2-1.3-11.5L12.5 3.5z" fill="#F57F17" /><path d="M9 2.5l-3.2 10.5L12.5 17.2 9 2.5z" fill="#FFCA28" /><path d="M16.2 14.5l-3.7-8.3 3.7-2.7 3.6 7.3-3.6 3.7z" fill="#FF8F00" /></svg>
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
    mongodb: "bg-[#00ED64]/10 text-[#016640]",
    stripe: "bg-[#635BFF]/10 text-[#635BFF]",
    resend: "bg-black dark:bg-white text-white dark:text-black",
    smtp: "bg-slate-100 dark:bg-white/10",
    cloudinary: "bg-[#3448C5]/10 text-[#3448C5]",
    s3: "bg-[#FF9900]/15 text-[#FF9900]",
    twilio: "bg-[#F22F46]/10 text-[#F22F46]",
    firebase: "bg-[#FFCA28]/20 text-[#F57F17]",
  };
  return map[provider] ?? "bg-primary/10 text-primary";
}

export function IntegrationsManager() {
  const [items, setItems] = useState<Integration[]>([]);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [provider, setProvider] = useState("mongodb");
  const [name, setName] = useState("");
  const { success, error } = useToast();
  async function load() { try { const response = await fetch("/api/admin/integrations"); const result = await response.json(); if (!response.ok) throw new Error(result.error); setItems(result.data ?? []); } catch (caught) { error(caught instanceof Error ? caught.message : "Unable to load integrations"); } }
  useEffect(() => { void load(); }, []);
  async function add() { const response = await fetch("/api/admin/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, name: name.trim() || names[provider], credentials: {} }) }); const result = await response.json(); if (!response.ok) { error(result.error ?? "Unable to add integration"); return; } setAddOpen(false); setName(""); success(`${names[provider]} added. Setup is required.`); await load(); }
  async function remove() { if (!removeId) return; const response = await fetch(`/api/admin/integrations/${removeId}`, { method: "DELETE" }); if (response.ok) { setItems((current) => current.filter((item) => item._id !== removeId)); success("Integration removed."); } else error("Unable to remove integration"); setRemoveId(null); }
  async function check(item: Integration) { const response = await fetch(`/api/admin/integrations/${item._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ check: true }) }); const result = await response.json(); if (!response.ok) { error("Unable to check integration"); return; } setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, ...result.data } : entry)); if (result.data.status === "connected") success(`${item.name} connection is valid.`); else error(result.data.statusMessage ?? "Connection check failed."); }
  const oauthOnly = new Set(["google", "facebook", "apple", "microsoft", "discord", "twitter", "linkedin"]);
  const activeProviders = new Set(items.map((item) => item.provider));
  const availableAll = Object.keys(providerFields).filter((entry) => !activeProviders.has(entry));
  const available = availableAll.filter((entry) => !oauthOnly.has(entry));
  const displayItems = items.filter((item) => !oauthOnly.has(item.provider));
  const border = (status: string) => status === "connected" ? "border-emerald-500/70" : status === "error" ? "border-red-500/70" : "border-amber-400/70";
  const statusColor = (status: string) => status === "connected" ? "text-emerald-500" : status === "error" ? "text-red-500" : "text-amber-500";
  return <section className="lg:col-span-2 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#13172b]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-ink dark:text-white">Project integrations</h2><p className="mt-1 text-sm text-ink/55 dark:text-white/60">Manage every service used by the application.</p></div><button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Add integration</button></div>
    <div className="mt-6"><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45 dark:text-white/45">Active integrations</h3><div className="mt-3 grid gap-4 md:grid-cols-2">{displayItems.map((item) => { return <article key={item._id} className={`rounded-2xl border-2 bg-paper p-5 dark:bg-white/[0.03] ${border(item.status)}`}><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${providerBg(item.provider)}`}><ProviderIcon provider={item.provider} size={20} /></div><div><h3 className="font-bold text-ink dark:text-white">{item.name}</h3><p className="mt-1 text-xs uppercase tracking-widest text-ink/45 dark:text-white/45">{names[item.provider] ?? item.provider}</p></div></div><button type="button" onClick={() => setRemoveId(item._id)} className="text-red-500" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></div><div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${statusColor(item.status)}`}>{item.status === "connected" ? <Check size={16} /> : <CircleAlert size={16} />}{item.status === "connected" ? "Connected" : item.status === "error" ? "Connection error" : "Setup required"}</div><div className="mt-4 flex gap-2"><Link href={`/admin/settings/integrations/${item._id}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"><Settings2 size={14} className="mr-1 inline" /> Manage</Link><button type="button" onClick={() => void check(item)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-semibold dark:border-white/10 dark:text-white">Check</button></div></article>; })}</div>{!displayItems.length && <p className="mt-4 rounded-xl border border-dashed border-ink/10 p-6 text-sm text-ink/55 dark:border-white/10 dark:text-white/55">No integrations are active yet.</p>}</div>
    <div className="mt-8 border-t border-ink/10 pt-6 dark:border-white/10"><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink/45 dark:text-white/45">Add integrations</h3><p className="mt-1 text-sm text-ink/55 dark:text-white/55">Choose a service to add it to the active list.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{available.map((entry) => { return <button type="button" key={entry} onClick={() => { setProvider(entry); setAddOpen(true); }} className="flex items-center gap-3 rounded-xl border border-ink/10 p-3 text-left hover:border-primary/40 dark:border-white/10"><span className={`grid h-9 w-9 place-items-center rounded-xl ${providerBg(entry)} shrink-0`}><ProviderIcon provider={entry} size={18} /></span><span><strong className="block text-sm text-ink dark:text-white">{names[entry] ?? entry}</strong><small className="text-xs text-ink/50 dark:text-white/50">{descriptions[entry]}</small></span></button>; })}</div></div>
    <Modal open={Boolean(removeId)} title="Remove integration?" onClose={() => setRemoveId(null)} onConfirm={() => void remove()} confirmLabel="Remove" danger>This will remove the integration configuration from this project.</Modal>
    {addOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171b31]"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-ink dark:text-white">Add integration</h2><button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-2 text-ink/50 dark:text-white/50" aria-label="Close"><X size={18} /></button></div><label className="mt-5 block text-sm font-semibold text-ink/70 dark:text-white/70">Integration method<div className="mt-2"><CustomSelect value={provider} options={available.map((entry) => ({ value: entry, label: names[entry] ?? entry }))} onChange={setProvider} placeholder="Select integration" /></div></label><label className="mt-4 block text-sm font-semibold text-ink/70 dark:text-white/70">Label<input value={name} onChange={(event) => setName(event.target.value)} placeholder={names[provider]} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 dark:border-white/10 dark:bg-white/5 dark:text-white" /></label><p className="mt-4 text-sm text-ink/55 dark:text-white/55">Add it first, then complete the provider-specific setup from its Manage page.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setAddOpen(false)} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold dark:border-white/10 dark:text-white">Cancel</button><button type="button" onClick={() => void add()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Add integration</button></div></div></div>}
  </section>;
}
