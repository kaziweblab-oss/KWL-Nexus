"use client";

import { Play, Copy, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useLanguage } from "@/components/shared/LanguageProvider";

const endpoints = ["/api/apps", "/api/apps/[id]", "/api/apps/[id]/plans", "/api/user/profile", "/api/user/subscriptions", "/api/payment/status/[id]"];
const exampleIds: Record<string, string> = {
  "/api/apps/[id]": "focus-flow",
  "/api/apps/[id]/plans": "focus-flow",
  "/api/payment/status/[id]": "payment_123",
};

// The console calls the same public API routes developers use in production.
export function ApiConsole() {
  const { t, lang } = useLanguage();
  const [endpoint, setEndpoint] = useState(endpoints[0]);
  const [key, setKey] = useState("");
  const [resourceId, setResourceId] = useState("focus-flow");
  const [response, setResponse] = useState("");
  const [copied, setCopied] = useState(false);
  const needsId = endpoint.includes("[id]");
  // keep placeholder i18n reactive — language switch hole placeholder o switch
  useEffect(() => {
    setResponse((prev) => {
      // if prev is empty or equals old placeholder (en/bn), replace with current lang placeholder
      if (!prev || prev === "Select an endpoint and run a request." || prev === "একটি এন্ডপয়েন্ট বেছে নিন এবং রিকোয়েস্ট চালান।" || prev === t("selectEndpoint")) return t("selectEndpoint");
      // also catch the initial t value from first render
      try {
        const parsed = JSON.parse(prev);
        if (parsed && typeof parsed === "object" && "status" in parsed) return prev;
      } catch {}
      // if its error/placeholder, leave as is unless it's exactly the other language's placeholder
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  async function runRequest() {
    let path = endpoint;
    if (needsId) {
      const id = resourceId.trim() || exampleIds[endpoint] || "YOUR_ID";
      path = endpoint.replace("[id]", encodeURIComponent(id));
    }
    try {
      const result = await fetch(path, { headers: key ? { "x-api-key": key } : {} });
      const text = await result.text();
      let body: unknown;
      try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
      setResponse(JSON.stringify({ status: result.status, path, body }, null, 2));
    } catch (e) {
      setResponse(JSON.stringify({ error: e instanceof Error ? e.message : t("requestFailed"), path }, null, 2));
    }
  }
  async function copyResponse() {
    try { await navigator.clipboard.writeText(response); setCopied(true); setTimeout(()=>setCopied(false),2000);} catch {}
  }
  return (
    <div className="grid gap-5 rounded-2xl border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#13172b] lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">
          {t("endpointLabel")}
          <div className="mt-2"><CustomSelect value={endpoint} options={endpoints} onChange={setEndpoint} /></div>
        </label>
        {needsId && (
          <label className="mt-4 block text-sm font-semibold text-ink/60 dark:text-white/60">
            {t("idLabel")} <span className="font-normal text-ink/40 dark:text-white/40">{t("replaceId")}</span>
            <input value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder={exampleIds[endpoint] ?? t("enterIdPlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" />
            <p className="mt-1.5 text-xs text-ink/40 dark:text-white/40">
              {t("eg")} <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs dark:bg-white/10">focus-flow</code>, <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs dark:bg-white/10">pixel-kit</code>, <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs dark:bg-white/10">shipyard</code>
            </p>
          </label>
        )}
        <label className="mt-5 block text-sm font-semibold text-ink/60 dark:text-white/60">
          {t("apiKeyLabel")}
          <input value={key} onChange={(event) => setKey(event.target.value)} type="password" placeholder="kn_live_..." className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1e2442] dark:text-white dark:placeholder:text-white/40 dark:focus:border-primary/40" />
        </label>
        <button onClick={runRequest} className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90">
          <Play size={14} fill="currentColor" /> {t("runRequest")}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl bg-[#0f0f1e] ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-3 py-2">
          <span className="text-xs font-semibold tracking-wide text-white/60">{t("responseLabel")}</span>
          <button onClick={copyResponse} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/15">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied ? t("copied") : t("copy")}
          </button>
        </div>
        <pre className="max-h-[320px] overflow-auto p-4 text-xs leading-6 text-[#b8f5e3]">{response || t("selectEndpoint")}</pre>
      </div>
    </div>
  );
}
