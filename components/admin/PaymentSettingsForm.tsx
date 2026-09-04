"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

// Payment instructions are loaded and saved through the admin settings API.
export function PaymentSettingsForm() {
  const [form, setForm] = useState({ bkash: "", nagad: "", rocket: "", helpText: "" });
  const [message, setMessage] = useState("");
  const { success, error } = useToast();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/admin/payment-settings");
        const text = await response.text();
        const result = text ? (JSON.parse(text) as { data?: typeof form; error?: string }) : {};
        if (!response.ok) throw new Error(result.error ?? `Failed to load payment settings (${response.status})`);
        if (!cancelled && result.data) setForm({ bkash: result.data.bkash ?? "", nagad: result.data.nagad ?? "", rocket: result.data.rocket ?? "", helpText: result.data.helpText ?? "" });
      } catch {
        // keep defaults and show silent failure - save will surface errors
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/payment-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const text = await response.text();
      const result = text ? (JSON.parse(text) as { error?: string }) : {};
      if (response.ok) { setMessage(""); success("Payment settings saved."); } else { const text = result.error ?? "Unable to save settings."; setMessage(""); error(text); }
    } catch {
      setMessage(""); error("Unable to save payment settings.");
    }
  }
  return <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-3"><label className="block text-sm font-semibold text-ink/60 dark:text-white/60">bKash<input value={form.bkash} onChange={(event) => setForm({ ...form, bkash: event.target.value })} placeholder="bKash number" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" /></label><label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Nagad<input value={form.nagad} onChange={(event) => setForm({ ...form, nagad: event.target.value })} placeholder="Nagad number" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" /></label><label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Rocket<input value={form.rocket} onChange={(event) => setForm({ ...form, rocket: event.target.value })} placeholder="Rocket number" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" /></label><label className="block text-sm font-semibold text-ink/60 dark:text-white/60 sm:col-span-3">Payment help text<textarea value={form.helpText} onChange={(event) => setForm({ ...form, helpText: event.target.value })} placeholder="e.g., Send to personal number and keep TxnID" className="mt-2 h-32 w-full resize-none rounded-xl border border-ink/10 bg-paper p-4 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" /></label><div className="sm:col-span-3"><button className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 dark:hover:bg-primary/80 transition"><Save size={15} /> Save payment settings</button>{message && <span className="ml-4 text-sm text-[#159570] dark:text-emerald-400">{message}</span>}</div></form>;
}
