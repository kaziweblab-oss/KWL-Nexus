"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Manual payment requests stay pending until an admin verifies the transaction.

type Method = { name: string; slug: string; type: string; provider: string; accountNumber: string; instructions: string; icon?: string };

// Brand badges (no external image hotlinking): official-ish brand colors + letter.
const BRAND: Record<string, { bg: string; letter: string }> = {
  bkash: { bg: "bg-[#E2136E]", letter: "b" },
  nagad: { bg: "bg-[#F6921E]", letter: "N" },
  rocket: { bg: "bg-[#8C3494]", letter: "R" },
};

const TRX_HINT: Record<string, string> = {
  bkash: "e.g. 9HXK2P7M4Q — auto UPPERCASE",
  nagad: "e.g. 8G4K2P9Q1R — auto UPPERCASE",
  rocket: "e.g. 7H2K9P4Q6M — auto UPPERCASE",
};

// Normalize per method as the user types so case/spacing never causes a mismatch.
function formatTrxId(raw: string) {
  return raw.toUpperCase().replace(/\s+/g, "");
}
export function PaymentRequestForm({ appId, planId, appName, amount }: { appId: string; planId: string; appName: string; amount: string }) {
  const { t } = useLanguage();
  const [method, setMethod] = useState("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const trxError = touched && !transactionId.trim() ? t("transactionIdRequired") : "";
  const activeMethod = methods.find((m) => m.slug === method);

  function pickMethod(slug: string) {
    setMethod(slug);
    setTransactionId((cur) => formatTrxId(cur));
  }

  async function copyAccount() {
    const num = activeMethod?.accountNumber ?? "";
    if (!num) return;
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;
    async function loadNumbers() {
      try {
        setLoadingNumbers(true);
        // Prefer new dynamic methods, fallback to legacy config
        try {
          const res = await fetch("/api/payment/methods", { cache: "no-store" });
          if (res.ok) {
            const j = await res.json();
              if (Array.isArray(j.data) && j.data.length) {
              if (!cancelled) {
                type MethodItem = { order?: number; slug: string; name: string; type: string; provider: string; accountNumber: string; instructions: string; icon?: string };
                const sorted = (j.data as MethodItem[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                setMethods(sorted);
                if (!sorted.find((m) => m.slug === method)) setMethod(sorted[0].slug);
                setLoadingNumbers(false);
                return;
              }
            }
          }
        } catch {}
        const response = await fetch("/api/payment/settings", { cache: "no-store" });
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!contentType.includes("application/json")) throw new Error("Non-JSON response");
        const text = await response.text();
        if (!text) throw new Error("Empty response");
        const result = JSON.parse(text);
        const data = result?.data ?? result;
        if (!cancelled && data && typeof data === "object") {
          const legacy = [
            { name: "bKash", slug: "bkash", type: "manual", provider: "bkash", accountNumber: data.bkash ?? "", instructions: data.helpText ?? "" },
            { name: "Nagad", slug: "nagad", type: "manual", provider: "nagad", accountNumber: data.nagad ?? "", instructions: data.helpText ?? "" },
            { name: "Rocket", slug: "rocket", type: "manual", provider: "rocket", accountNumber: data.rocket ?? "", instructions: data.helpText ?? "" },
          ].filter((m) => m.accountNumber);
          setMethods(legacy.length ? legacy : [
            { name: "bKash", slug: "bkash", type: "manual", provider: "bkash", accountNumber: data.bkash ?? "", instructions: data.helpText ?? "" },
            { name: "Nagad", slug: "nagad", type: "manual", provider: "nagad", accountNumber: data.nagad ?? "", instructions: data.helpText ?? "" },
            { name: "Rocket", slug: "rocket", type: "manual", provider: "rocket", accountNumber: data.rocket ?? "", instructions: data.helpText ?? "" },
          ]);
        }
      } catch (error) {
        console.error("Failed to load payment numbers:", error);
      } finally {
        if (!cancelled) setLoadingNumbers(false);
      }
    }
    loadNumbers();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setOrderId(null);
    if (!transactionId.trim()) return;
    try {
      const response = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Never send price from the client — the server prices from the plan.
        body: JSON.stringify({
          planId,
          appId,
          paymentMethod: method,
          transactionId,
        }),
      });
      let data: Record<string, unknown> | null = null;
      try {
        const text = await response.text();
        data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }
      if (response.ok) {
        const d = data as { data?: { id?: string }; paymentId?: string; orderId?: string | null } | null;
        const id = d?.data?.id ?? d?.paymentId;
        setOrderId(typeof d?.orderId === "string" ? d.orderId : null);
        setMessage(id ? `${t("requestPending")} ${id}` : t("requestPending"));
      } else {
        const err = data as { error?: string } | null;
        setMessage(err?.error ?? t("unableToSubmit"));
      }
    } catch (error) {
      console.error("Payment request failed:", error);
      setMessage(t("unableToSubmitRetry"));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 rounded-[1.5rem] border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 shadow-sm">
      <h2 className="text-xl font-bold text-ink dark:text-white">{t("payManuallyFor")} {appName}</h2>
      <p className="mt-2 text-sm text-ink/55 dark:text-white/60">{t("payDescSend")} {amount} {t("payDescToNumber")}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {methods.map((m) => {
          const selected = method === m.slug;
          const brand = BRAND[m.slug] ?? { bg: "bg-primary", letter: m.name.slice(0, 1).toUpperCase() };
          return (
            <button
              type="button"
              key={m.slug}
              onClick={() => pickMethod(m.slug)}
              aria-pressed={selected}
              className={`rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary text-white dark:bg-primary dark:border-primary shadow ring-2 ring-primary/30" : "border-ink/10 dark:border-white/10 bg-paper dark:bg-white/5 hover:border-primary/30 dark:hover:border-white/20"}`}
            >
              <span className="flex items-center gap-2">
                {m.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.icon} alt={m.name} className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-black text-white ${brand.bg}`}>{brand.letter}</span>
                )}
                <span className={`text-sm font-bold ${selected ? "text-white" : "text-ink dark:text-white"}`}>{m.name}</span>
                {m.type === "gateway" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${selected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"}`}>gateway</span>}
              </span>
              <span className="mt-2 flex items-center gap-1.5">
                <span className={`truncate font-mono text-xs ${selected ? "text-white/85" : "text-ink/55 dark:text-white/55"}`}>{loadingNumbers ? t("loading") : m.accountNumber || (m.type === "gateway" ? (m.provider || "Gateway") : t("notConfigured"))}</span>
                {selected && m.accountNumber && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="Copy number"
                    onClick={(e) => { e.stopPropagation(); void copyAccount(); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); void copyAccount(); } }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/15 hover:text-white"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </span>
                )}
              </span>
              {m.instructions && <p className={`mt-1 line-clamp-2 text-[11px] leading-tight ${selected ? "text-white/70" : "text-ink/40 dark:text-white/40"}`}>{m.instructions}</p>}
            </button>
          );
        })}
      </div>
      <label className="mt-5 block text-sm font-semibold text-ink/60 dark:text-white/60">
        {t("transactionId")}
        <input
          value={transactionId}
          onChange={(event) => setTransactionId(formatTrxId(event.target.value))}
          placeholder={TRX_HINT[method] ?? t("enterTransactionId")}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(trxError)}
          className={`mt-2 h-11 w-full rounded-xl border bg-paper dark:bg-white/10 px-4 font-mono text-sm tracking-wider text-ink dark:text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${trxError ? "border-red-400 focus:ring-red-400/20" : "border-ink/10 dark:border-white/10"}`}
        />
      </label>
      {trxError && <p className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400">{trxError}</p>}
      <button className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition">{t("submitPaymentRequest")}</button>
      {message && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#159570] dark:text-emerald-400">{message}</p>
          {orderId && (
            <a href="/my-orders" className="mt-1 inline-block text-sm font-semibold text-primary underline dark:text-secondary">
              {t("myOrders")}
            </a>
          )}
        </div>
      )}
    </form>
  );
}
