"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Braces, Download, Terminal, Copy, Check } from "lucide-react";
import { apiEndpoints } from "@/lib/api/docs";
import { useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

const javascriptExample = `const response = await fetch("/api/apps", {
  headers: { "x-api-key": process.env.KWL_API_KEY }
});
const { data } = await response.json();`;
const pythonExample = `import requests
response = requests.get(
  "https://your-domain.com/api/apps",
  headers={"x-api-key": KWL_API_KEY}
)`;

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl sm:rounded-2xl bg-[#0f0f1e] ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-3 py-2 sm:px-4">
        <span className="text-xs font-semibold tracking-wide text-white/60">{lang}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white transition cursor-pointer"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <pre className="overflow-auto p-3 text-[11px] leading-5 sm:p-4 sm:text-xs sm:leading-6 text-[#b8f5e3] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <code className="block min-w-0 whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

// Public API documentation is intentionally plain and copy-friendly for developers.
export default function DocsPage() {
  const { t } = useLanguage();
  const authParts = t("authDesc", { header: "__HEADER__" }).split("__HEADER__");
  const endpointDesc: Record<string, string> = {
    "/api/apps": t("apiDescApps"),
    "/api/apps/[id]": t("apiDescAppsId"),
    "/api/apps/[id]/plans": t("apiDescAppsPlans"),
    "/api/apps/popular": t("apiDescAppsPopular"),
    "/api/apps/new-releases": t("apiDescAppsNewReleases"),
    "/api/public/apps": t("apiDescPublicApps"),
    "/api/apps/[id]/tutorial": t("apiDescAppsTutorial"),
    "/api/payment/methods": t("apiDescPaymentMethods"),
    "/api/payment/request": t("apiDescPaymentRequest"),
    "/api/payment/status/[id]": t("apiDescPaymentStatus"),
    "/api/payment/history": t("apiDescPaymentHistory"),
    "/api/user/profile": t("apiDescUserProfile"),
    "/api/user/subscriptions": t("apiDescUserSubs"),
    "/api/system-config": t("apiDescSystemConfig"),
    "/api/update-guidelines": t("apiDescUpdateGuidelines"),
    "/api/health": t("apiDescHealth"),
    "/api/ping": t("apiDescPing"),
  };
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-primary">
          <BookOpen size={16} /> {t("docsBadge")}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-ink sm:text-5xl">{t("docsTitle")}</h1>
        <p className="mt-4 text-base leading-7 text-ink/60 sm:text-lg sm:leading-8">{t("docsDesc")}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-2 sm:gap-3">
        <Link href="/docs/console" className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white sm:px-5 sm:py-3">
          {t("openTestConsole")} <ArrowRight size={16} />
        </Link>
        <a href="/api/docs/openapi" className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink sm:px-5 sm:py-3">
          <Braces size={16} /> {t("openApiJson")}
        </a>
        <a href="/api/docs/postman" className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink sm:px-5 sm:py-3">
          <Download size={16} /> {t("postman")}
        </a>
        <a href="/kwl-nexus-integration-guide.pdf" download className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink sm:px-5 sm:py-3">
          <Download size={16} /> {t("pdfGuide")}
        </a>
      </div>
      <section className="mt-10 sm:mt-14">
        <h2 className="text-xl font-bold text-ink dark:text-white sm:text-2xl">{t("authSection")}</h2>
        <p className="mt-3 text-sm text-ink/60 dark:text-white/60 sm:text-base">
          {authParts[0]}
          <code className="rounded border border-ink/10 bg-paper px-2 py-1 text-sm font-mono text-ink dark:border-white/10 dark:bg-white/10 dark:text-white">x-api-key</code>
          {authParts[1]}
        </p>
        <div className="relative mt-4 overflow-hidden rounded-xl bg-ink ring-1 ring-white/10 sm:rounded-2xl sm:mt-5">
          <div className="flex justify-end border-b border-white/10 bg-white/[0.04] px-3 py-2">
            <button
              onClick={() => navigator.clipboard.writeText(`curl https://your-domain.com/api/apps \\\n  -H "x-api-key: kn_live_..."`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/15 cursor-pointer"
            >
              <Copy size={13} /> {t("copy")}
            </button>
          </div>
          <pre className="overflow-auto p-3 text-xs leading-6 text-[#b8f5e3] sm:p-5 sm:text-sm sm:leading-7">curl https://your-domain.com/api/apps {"\\"}
            {"\n"}  -H &quot;x-api-key: kn_live_...&quot;</pre>
        </div>
      </section>
      <section className="mt-10 sm:mt-14">
        <h2 className="text-xl font-bold text-ink sm:text-2xl">{t("endpoints")}</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-white sm:rounded-2xl sm:mt-5">
          {apiEndpoints.map((endpoint) => (
            <div key={endpoint.path} className="flex flex-col gap-2 border-b border-ink/10 p-4 last:border-0 sm:flex-row sm:items-center sm:p-5">
              <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${endpoint.method === "GET" ? "bg-[#e5f8f1] text-[#159570]" : "bg-[#fff6dd] text-[#b77900]"}`}>{endpoint.method}</span>
              <code className="break-all text-sm font-semibold text-ink">{endpoint.path}</code>
              <span className="text-sm text-ink/50 sm:ml-auto">{endpointDesc[endpoint.path] ?? endpoint.description}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-primary sm:h-[18px] sm:w-[18px]" />
            <h2 className="text-xl font-bold text-ink sm:text-2xl">{t("jsExample")}</h2>
          </div>
          <CodeBlock code={javascriptExample} lang={t("jsExample")} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-primary sm:h-[18px] sm:w-[18px]" />
            <h2 className="text-xl font-bold text-ink sm:text-2xl">{t("pyExample")}</h2>
          </div>
          <CodeBlock code={pythonExample} lang={t("pyExample")} />
        </div>
      </section>
      <section className="mt-8 rounded-xl border border-primary/20 bg-primary/[.05] p-4 sm:mt-10 sm:rounded-2xl sm:p-6">
        <h2 className="font-bold text-ink">{t("sdkInstallation")}</h2>
        <p className="mt-2 text-sm text-ink/60">{t("sdkDesc")}</p>
        <code className="mt-3 block text-xs text-primary sm:mt-4 sm:text-sm">npm install axios</code>
        <code className="mt-2 block text-xs text-primary sm:text-sm">pip install requests</code>
        <code className="mt-2 block text-xs text-primary sm:text-sm">flutter pub add http</code>
      </section>
    </main>
  );
}
