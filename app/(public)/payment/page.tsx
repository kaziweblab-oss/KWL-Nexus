"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { NexusLoader } from "@/components/ui/NexusLoader";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { getApp } from "@/lib/data/apps";

interface PaymentFormData {
  planId: string;
  appId: string;
  paymentMethod: "bkash" | "nagad" | "rocket";
  transactionId: string;
  notes: string;
}
type PaymentMethod = { name: string; slug: string; accountNumber?: string; instructions?: string; qrImageUrl?: string; type: string };
type CheckoutPlan = { name: string; price: string; cadence: string; description: string };

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const appId = searchParams.get("appId");
  const planId = searchParams.get("planId");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentNumbers, setPaymentNumbers] = useState<{ bkash: string; nagad: string; rocket: string }>({
    bkash: "",
    nagad: "",
    rocket: "",
  });
  const [numbersLoading, setNumbersLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    planId: planId || "",
    appId: appId || "",
    paymentMethod: "bkash",
    transactionId: "",
    notes: "",
  });

  const app = useMemo(() => (appId ? getApp(appId) : null), [appId]);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan | null>(() => {
    if (process.env.NODE_ENV === "production") return null;
    return app && planId ? app.plans.find((p) => p.name === decodeURIComponent(planId)) ?? null : null;
  });
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    if (!appId || !planId) { setError(t("appOrPlanNotFound")); setPlanLoading(false); return; }
    if (!app) { setError(t("appNotFound")); setPlanLoading(false); return; }
    // if dummy plan already found, still verify with DB but keep loading brief — in production dummy not allowed
    setPlanLoading(true);
    setError(null);
    const isProd = process.env.NODE_ENV === "production";
    const dummyExists = !isProd && app.plans.some((p) => p.name === decodeURIComponent(planId));
    fetch(`/api/apps/${encodeURIComponent(appId)}/plans`, { cache: "no-store" }).then((response) => response.json()).then((result) => {
      const databasePlan = Array.isArray(result.data) ? result.data.find((entry: { name?: string }) => entry.name === decodeURIComponent(planId)) : null;
      if (databasePlan) setSelectedPlan({ name: databasePlan.name, price: `$${databasePlan.price}`, cadence: databasePlan.interval === "lifetime" ? "one-time" : databasePlan.interval === "custom" ? `${databasePlan.durationDays ?? "custom"} days` : databasePlan.interval, description: databasePlan.description ?? "" });
      else if (!dummyExists) setError(t("appOrPlanNotFound"));
    }).catch(() => { if (!dummyExists) setError(t("appOrPlanNotFound")); }).finally(() => setPlanLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, planId]);

  // Fetch payment numbers from API per spec: পেমেন্ট নম্বর API থেকে নেবে (robust JSON handling)
  useEffect(() => {
    async function fetchNumbers() {
      try {
        const res = await fetch("/api/payment/settings", { cache: "no-store" });
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!contentType.includes("application/json")) throw new Error("Non-JSON");
        const text = await res.text();
        if (!text) throw new Error("Empty response");
        const json = JSON.parse(text);
        if (json?.data) {
          setPaymentNumbers({
            bkash: json.data.bkash || "",
            nagad: json.data.nagad || "",
            rocket: json.data.rocket || "",
          });
        }
      } catch {
        // silent - show Not configured, prevents Unexpected end of JSON input
      } finally {
        setNumbersLoading(false);
      }
    }
    fetchNumbers();
  }, []);

  useEffect(() => {
    fetch("/api/payment/methods", { cache: "no-store" }).then((res) => res.json()).then((result) => {
      if (Array.isArray(result.data)) setPaymentMethods(result.data);
    }).catch(() => undefined);
  }, []);

  const selectedMethod = paymentMethods.find((method) => method.slug === formData.paymentMethod);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.transactionId.trim()) {
        throw new Error(t("transactionIdRequired"));
      }

      const response = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("paymentRequestFailed"));
      }

      showToast(t("paymentRequestSuccess"), "success");

      // Redirect to download page
      setTimeout(() => {
        router.push(`/download/${appId}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("somethingWentWrong");
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (planLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-14 lg:px-8 text-center">
        <NexusLoader label={t("loading")} />
        <p className="mt-4 text-sm text-ink/50 dark:text-white/50">{t("loadingAppInfo")}</p>
      </main>
    );
  }

  if (!app || !selectedPlan) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-14 lg:px-8">
        <Link href="/apps" className="mb-6 inline-flex items-center gap-2 self-center text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50">
          <ArrowLeft size={16} /> {t("backToApps")}
        </Link>
        <div className="w-full">
          <ErrorMessage
            title={t("appNotFound")}
            message={t("appNotFoundDesc")}
            onClose={() => router.push("/apps")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 lg:px-8">
      <Link href={`/apps/${appId}`} className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary">
        <ArrowLeft size={16} /> {t("cancelPayment")}
      </Link>

      <div className="mt-10 rounded-2xl border border-ink/10 dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-8">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-ink/10 dark:border-white/10">
          <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl text-white" style={{ backgroundColor: app.accent }}>
            {app.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ink">{app.name}</h1>
            <p className="text-sm text-ink/60">{selectedPlan.name} প্ল্যান - {selectedPlan.description}</p>
          </div>
        </div>

        {/* Price Section */}
        <div className="mt-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink/60">{t("totalPayment")}</span>
            <div>
              <span className="text-4xl font-bold text-primary">{selectedPlan.price}</span>
              <span className="ml-2 text-sm text-ink/60">{t("perCadence")} {selectedPlan.cadence.replace("/", " ")}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6">
            <ErrorMessage
              message={error}
              onRetry={() => setError(null)}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Payment Method Selection - পেমেন্ট নম্বর API থেকে */}
          <fieldset>
            <legend className="block text-sm font-semibold text-ink mb-3">{t("selectPaymentMethod")}</legend>
            <div className="space-y-3">
              {(["bkash", "nagad", "rocket"] as const).map((method) => {
                const configured = selectedMethod?.slug === method ? selectedMethod : paymentMethods.find((entry) => entry.slug === method);
                const number = configured?.accountNumber ?? paymentNumbers[method];
                const label = method === "bkash" ? "🏦 bKash" : method === "nagad" ? "📱 Nagad" : "💳 Rocket";
                return (
                  <label
                    key={method}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl border cursor-pointer transition ${
                      formData.paymentMethod === method ? "border-primary bg-primary/[.04]" : "border-ink/10 hover:border-primary/30"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={formData.paymentMethod === method}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentMethod: e.target.value as "bkash" | "nagad" | "rocket" })
                        }
                        className="w-4 h-4"
                      />
                      <span className="font-semibold text-ink uppercase tracking-wide">{label}</span>
                    </span>
                    <span className="text-sm font-mono font-semibold text-ink/70">
                      {numbersLoading ? t("loading") : number || t("notConfigured")}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedMethod?.instructions && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.05] p-4 text-sm leading-6 text-ink/70 dark:border-primary/30 dark:bg-primary/10 dark:text-white/75"><p className="font-bold text-ink dark:text-white">How to pay with {selectedMethod.name}</p><p className="mt-1 whitespace-pre-wrap">{selectedMethod.instructions}</p></div>}
            {selectedMethod?.qrImageUrl && <button type="button" onClick={() => setQrOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">View payment QR</button>}
            {!numbersLoading && !paymentNumbers.bkash && !paymentNumbers.nagad && !paymentNumbers.rocket && (
              <p className="mt-2 text-xs text-amber-600">{t("paymentNumberNotConfiguredAdmin")}</p>
            )}
          </fieldset>

          {/* Transaction ID Input */}
          <div>
            <label htmlFor="transactionId" className="block text-sm font-semibold text-ink mb-2">
              {t("transactionId")} *
            </label>
            <input
              id="transactionId"
              type="text"
              placeholder={t("enterTransactionId")}
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-ink/10 focus:border-primary focus:outline-none transition text-ink placeholder:text-ink/40"
            />
            <p className="mt-2 text-xs text-ink/50">{t("exampleTransaction")}</p>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-ink mb-2">
              {t("notesOptional")}
            </label>
            <textarea
              id="notes"
              placeholder={t("addExtraInfo")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 px-4 py-3 focus:border-primary focus:outline-none transition text-ink placeholder:text-ink/40"
            />
          </div>

          {/* Important Notice */}
          <div className="flex gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <AlertCircle size={20} className="flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">{t("note")}</p>
              <p>{t("paymentVerifyNotice")}</p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary py-4 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-75 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {t("processingPayment")}
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> {t("submitPaymentRequest")}
              </>
            )}
          </button>
        </form>
      </div>
      {qrOpen && selectedMethod?.qrImageUrl && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setQrOpen(false)}><div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-[#1a1a2e]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-bold text-ink dark:text-white">Scan {selectedMethod.name} QR</h2><button type="button" onClick={() => setQrOpen(false)} className="rounded-full p-2 text-ink/50 hover:bg-paper dark:text-white/50" aria-label="Close QR"><span className="text-lg">×</span></button></div><img src={selectedMethod.qrImageUrl} alt={`${selectedMethod.name} payment QR`} className="mx-auto mt-4 max-h-80 w-full object-contain" /><p className="mt-3 text-xs text-ink/50 dark:text-white/50">Scan this code, complete payment, then enter the transaction ID below.</p></div></div>}
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-14 lg:px-8 text-center text-ink/60">লোড হচ্ছে...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
