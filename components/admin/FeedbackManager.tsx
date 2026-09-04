"use client";

import { MessageSquareReply, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useLanguage } from "@/components/shared/LanguageProvider";

const statuses = ["all", "pending", "replied", "resolved", "ignored"];
const types = ["all", "bug_report", "suggestion", "feature_request", "rating"];
type FeedbackItem = { _id: string; title: string; description: string; type: string; status: string; adminReply?: string; appId?: { name?: string } };

// Moderation controls stay client-side while the admin API remains the authority.
export function FeedbackManager() {
  const { t } = useLanguage();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/admin/feedbacks");
        const text = await response.text();
        const result = text ? (JSON.parse(text) as { data?: FeedbackItem[]; error?: string }) : {};
        if (!response.ok) throw new Error(result.error ?? `Failed to load feedback (${response.status})`);
        if (!cancelled) setItems(result.data ?? []);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unable to load feedback");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = useMemo(() => items.filter((item) => (status === "all" || item.status === status) && (type === "all" || item.type === type) && `${item.title} ${item.description} ${item.appId?.name ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, query, status, type]);
  async function update(id: string, nextStatus: string) { const adminReply = window.prompt(t("replyToUser")) ?? ""; const response = await fetch("/api/admin/feedbacks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus, adminReply }) }); if (response.ok) setItems((current) => current.map((item) => item._id === id ? { ...item, status: nextStatus, adminReply } : item)); }
  return <div>{loadError && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">{loadError}</div>}<div className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 md:grid-cols-[1fr_auto_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchFeedback")} className="h-10 w-full rounded-xl bg-paper pl-9 pr-3 text-sm outline-none" /></label><CustomSelect value={type} options={["all", ...types.slice(1)]} onChange={setType} placeholder={t("allTypes")} /><CustomSelect value={status} options={["all", ...statuses.slice(1)]} onChange={setStatus} placeholder={t("allStatuses")} /></div><div className="mt-5 space-y-3">{filtered.map((item) => <article key={item._id} className="rounded-2xl border border-ink/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">{item.type} · {item.appId?.name ?? "Unknown app"}</p><h2 className="mt-2 font-bold text-ink">{item.title}</h2><p className="mt-2 text-sm leading-6 text-ink/60">{item.description}</p></div><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/55">{item.status}</span></div>{item.adminReply && <p className="mt-4 rounded-xl bg-[#e5f8f1] p-3 text-sm text-[#159570]">{t("replyLabel")} {item.adminReply}</p>}<div className="mt-5 flex gap-2"><button onClick={() => update(item._id, "replied")} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"><MessageSquareReply size={14} />{t("reply")}</button><button onClick={() => update(item._id, "resolved")} className="rounded-full bg-[#e5f8f1] px-4 py-2 text-xs font-semibold text-[#159570]">{t("resolve")}</button><button onClick={() => update(item._id, "ignored")} className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-500">{t("ignore")}</button></div></article>)}</div></div>;
}
