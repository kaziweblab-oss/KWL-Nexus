"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Manual payment requests stay pending until an admin verifies the transaction.
export function PaymentRequestForm({ appName, amount }: { appName: string; amount: string }) {
  const { t } = useLanguage();
  const [method, setMethod] = useState("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");
  const [methods, setMethods] = useState<{ name: string; slug: string; type: string; provider: string; accountNumber: string; instructions: string }[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [touched, setTouched] = useState(false);
  const trxError = touched && !transactionId.trim() ? t("transactionIdRequired") : "";

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
                type MethodItem = { order?: number; slug: string; name: string; type: string; provider: string; accountNumber: string; instructions: string };
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
    if (!transactionId.trim()) return;
    try {
      const response = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount.replace(/[^0-9.]/g, "")),
          currency: "USD",
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
        const d = data as { data?: { id?: string }; paymentId?: string } | null;
        const id = d?.data?.id ?? d?.paymentId;
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
        {methods.map((m) => (
          <button
            type="button"
            key={m.slug}
            onClick={() => setMethod(m.slug)}
            className={`rounded-xl border p-3 text-left transition ${method === m.slug ? "border-primary bg-primary text-white dark:bg-primary dark:border-primary shadow" : "border-ink/10 dark:border-white/10 bg-paper dark:bg-white/5 hover:border-primary/30 dark:hover:border-white/20"}`}
          >
            <p className={`text-sm font-bold flex items-center gap-1.5 ${method === m.slug ? "text-white" : "text-ink dark:text-white"}`}>{m.name} {m.type==="gateway"&&<span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${method===m.slug?"bg-white/20 text-white":"bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"}`}>gateway</span>}</p>
            <p className={`mt-1 text-xs truncate ${method === m.slug ? "text-white/80" : "text-ink/50 dark:text-white/50"}`}>{loadingNumbers ? t("loading") : m.accountNumber || (m.type==="gateway" ? (m.provider || "Gateway") : t("notConfigured"))}</p>
            {m.instructions && <p className={`mt-1 line-clamp-2 text-[11px] leading-tight ${method===m.slug?"text-white/70":"text-ink/40 dark:text-white/40"}`}>{m.instructions}</p>}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-sm font-semibold text-ink/60 dark:text-white/60">
        {t("transactionId")}
        <input
          value={transactionId}
          onChange={(event) => setTransactionId(event.target.value)}
          placeholder={t("enterTransactionId")}
          aria-invalid={Boolean(trxError)}
          className={`mt-2 h-11 w-full rounded-xl border bg-paper dark:bg-white/10 px-4 text-sm text-ink dark:text-white placeholder:text-ink/40 dark:placeholder:text-white/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${trxError ? "border-red-400 focus:ring-red-400/20" : "border-ink/10 dark:border-white/10"}`}
        />
      </label>
      {trxError && <p className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400">{trxError}</p>}
      <button className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition">{t("submitPaymentRequest")}</button>
      {message && <p className="mt-4 text-sm font-semibold text-[#159570] dark:text-emerald-400">{message}</p>}
    </form>
  );
}
