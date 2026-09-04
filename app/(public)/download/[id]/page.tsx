"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Smartphone, Monitor, Terminal } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { getApp } from "@/lib/data/apps";

type Platform = "android" | "windows" | "linux";

interface PlatformInfo {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  extension: string;
}

const platforms: PlatformInfo[] = [
  { id: "android", name: "Android", icon: <Smartphone size={24} />, extension: ".apk" },
  { id: "windows", name: "Windows", icon: <Monitor size={24} />, extension: ".exe" },
  { id: "linux", name: "Linux", icon: <Terminal size={24} />, extension: ".deb/.rpm" },
];

export default function DownloadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [app, setApp] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const appData = getApp(params.id);
    if (appData) {
      setApp(appData);
    } else {
      setDownloadError(t("appNotFound"));
    }
  }, [params.id]);

  // Fetch real subscription if available, else treat as pending (not success) — fixes "subscription successful" when still pending
  useEffect(() => {
    if (!app) return;
    async function loadSubscription() {
      try {
        const res = await fetch("/api/user/subscriptions");
        if (res.ok) {
          const json = await res.json();
          const subs = json.data || json.subscriptions || [];
          const match = subs.find((s: any) => {
            const appIdVal = s.appId ?? s.planId?.appId ?? s.plan?.appId;
            return String(appIdVal) === params.id || String(s.appId?._id) === params.id || String(s.planId?._id) === params.id;
          });
          if (match) {
            setSubscription({
              planName: match.planId?.name || match.plan?.name || app.plans[0].name,
              startDate: new Date(match.startDate || match.startedAt || Date.now()).toLocaleDateString("bn-BD"),
              endDate: new Date(match.endDate || match.endsAt || Date.now() + 30 * 86400000).toLocaleDateString("bn-BD"),
            });
            setIsPending(false);
            return;
          }
        }
      } catch {
        // fallback to pending
      }
      // No active subscription → pending state (payment still under review, not success)
      setIsPending(true);
      setSubscription({
        planName: app.plans[0].name,
        startDate: new Date().toLocaleDateString("bn-BD"),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("bn-BD"),
      });
    }
    loadSubscription();
  }, [app, params.id]);

  async function handleDownload(platform: Platform) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/download/${params.id}?platform=${platform}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("downloadFailed"));
      }

      // Trigger download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = `${app.name}-${platform}${platforms.find((p) => p.id === platform)?.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`${app.name} ${t("downloadStarted")}`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("downloadFailed");
      setDownloadError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (!app) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-14 lg:px-8">
        <ErrorMessage
          title={t("appNotFound")}
          message={t("appNotFoundDesc")}
          onClose={() => router.push("/apps")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 lg:px-8">
      <div className={`rounded-2xl border p-8 text-center ${isPending ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20" : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"}`}>
        {/* Success / Pending Icon */}
        <div className="flex justify-center mb-6">
          <div className={`rounded-full p-4 ${isPending ? "bg-amber-100 dark:bg-amber-900/40" : "bg-green-100 dark:bg-green-900/40"}`}>
            {isPending ? <Clock size={48} className="text-amber-600 dark:text-amber-400" /> : <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />}
          </div>
        </div>

        {/* Success / Pending Message */}
        <h1 className={`text-4xl font-bold mb-2 ${isPending ? "text-amber-800 dark:text-amber-100" : "text-green-800 dark:text-green-100"}`}>{isPending ? `⏳ ${t("subscriptionPending")}` : `🎉 ${t("subscriptionSuccess")}`}</h1>
        <p className={`text-lg mb-8 ${isPending ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"}`}>{isPending ? t("paymentVerifyingPendingDesc") : t("paymentSuccessDesc")}</p>

        {/* App Info */}
        <div className="bg-white dark:bg-white/5 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-4 mb-6">
            <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl text-white" style={{ backgroundColor: app.accent }}>
              {app.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ink dark:text-white">{app.name}</h2>
              <p className="text-sm text-ink/60 dark:text-white/60">Version {app.latestVersion || "1.0.0"}</p>
            </div>
          </div>

          {/* Subscription Details */}
          {subscription && (
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink/60 dark:text-white/60 mb-1">{t("plan")}</p>
                  <p className="font-bold text-ink dark:text-white">{subscription.planName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink/60 dark:text-white/60 mb-1">{t("expiryDate")}</p>
                  <p className="font-bold text-ink dark:text-white">{subscription.endDate}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {downloadError && (
          <div className="mb-8">
            <ErrorMessage
              message={downloadError}
              onRetry={() => setDownloadError(null)}
              onClose={() => setDownloadError(null)}
            />
          </div>
        )}

        {/* Download Options */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-ink dark:text-white mb-6 text-left">{t("selectPlatform")}</h3>
          {isPending && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {t("featuresPendingAdmin")}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handleDownload(platform.id)}
                disabled={isLoading || isPending}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border transition ${isPending ? "border-amber-200 bg-amber-50/50 opacity-60 cursor-not-allowed dark:border-amber-800 dark:bg-amber-900/10" : "border-ink/10 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-primary dark:hover:border-secondary hover:shadow-lg"} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={isPending ? "text-amber-600 dark:text-amber-400" : "text-primary dark:text-secondary"}>{platform.icon}</div>
                <div>
                  <p className="font-bold text-ink dark:text-white">{platform.name}</p>
                  <p className="text-xs text-ink/60 dark:text-white/60">{platform.extension}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/my-orders"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ink dark:bg-white text-white dark:text-ink font-semibold hover:opacity-90 transition"
          >
            {t("myOrders")}
          </Link>
          <Link
            href="/apps"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-ink/10 dark:border-white/10 text-ink dark:text-white font-semibold hover:bg-ink/5 dark:hover:bg-white/5 transition"
          >
            {t("browseMoreApps")}
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-12 rounded-xl border border-ink/10 dark:border-white/10 p-6">
        <h3 className="font-bold text-ink dark:text-white mb-4">{t("needHelp")}</h3>
        <p className="text-sm text-ink/60 dark:text-white/60 mb-4">
          {t("ifDownloadNotStart")}
        </p>
        <ul className="text-sm text-ink/60 dark:text-white/60 space-y-2 list-disc list-inside">
          <li>{t("checkDownloadSettings")}</li>
          <li>{t("disablePopupBlocker")}</li>
          <li>{t("tryDifferentBrowser")}</li>
          <li>{t("contactIfIssuePersists")}</li>
        </ul>
      </div>
    </main>
  );
}
