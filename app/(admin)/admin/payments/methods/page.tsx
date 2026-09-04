"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaymentMethodManager } from "@/components/admin/PaymentMethodManager";
import { useLanguage } from "@/components/shared/LanguageProvider";

export const dynamic = "force-dynamic";

export default function PaymentMethodsPage() {
  const { t } = useLanguage();
  return (
    <main>
      <Link href="/admin/payments" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/60">
        <ArrowLeft size={16}/> {t("backToPayments")}
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">{t("paymentGateways")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-white">{t("managePaymentMethodsTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60 dark:text-white/60">
            {t("addEditDesc")}
          </p>
        </div>
      </div>
      <PaymentMethodManager />
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t("gatewayApiNote")}</p>
        <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200/80">
          {t("gatewayApiDesc")}
        </p>
      </div>
    </main>
  );
}
